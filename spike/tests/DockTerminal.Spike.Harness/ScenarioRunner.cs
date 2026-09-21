using System.Diagnostics;
using System.Text.RegularExpressions;
using DockTerminal.Spike.Core.Native;

namespace DockTerminal.Spike.Harness;

public sealed record ScenarioResultModel(string Name, bool Passed, string Detail);

public sealed class ScenarioRunner
{
    private static readonly TimeSpan StartupTimeout = TimeSpan.FromSeconds(30);
    private static readonly TimeSpan CommandTimeout = TimeSpan.FromSeconds(20);
    private static readonly TimeSpan BenchTimeout = TimeSpan.FromSeconds(120);
    private const int BenchBlocks = 100;

    private readonly PseudoConsoleProvider _provider;
    private readonly List<ScenarioResultModel> _results = new();

    public ScenarioRunner(PseudoConsoleProvider provider) => _provider = provider;

    public async Task<IReadOnlyList<ScenarioResultModel>> RunAsync()
    {
        var home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        using var probe = new ShellProbe(_provider, $"harness-{_provider}", home);
        await RunScenarioAsync("Démarrage et première séquence OSC 7", probe, () => StartupAsync(probe, home));
        await RunScenarioAsync("Profil chargé, oh-my-posh, variables Dock, sans WezTerm", probe, () => ProfileAsync(probe));
        await RunScenarioAsync("Dossier courant après cd", probe, () => ChangeDirectoryAsync(probe));
        await RunScenarioAsync("Dossier courant après une fonction du profil", probe, () => FunctionDirectoryAsync(probe));
        await RunScenarioAsync("Redimensionnement ConPTY", probe, () => ResizeAsync(probe));
        await RunScenarioAsync("Débit ConPTY soutenu", probe, () => ThroughputAsync(probe));
        await RunScenarioAsync("Job Object : aucun processus survivant", probe, () => JobObjectAsync(probe));
        return _results;
    }

    private async Task RunScenarioAsync(string name, ShellProbe probe, Func<Task<string>> scenario)
    {
        try
        {
            _results.Add(new ScenarioResultModel(name, true, await scenario()));
        }
        catch (Exception exception)
        {
            _results.Add(new ScenarioResultModel(name, false, $"{exception.Message} — fin de transcription : « {probe.TranscriptTail(240)} »"));
        }
    }

    private static async Task<string> StartupAsync(ShellProbe probe, string home)
    {
        var clock = Stopwatch.StartNew();
        var directory = await probe.WaitForDirectoryAsync(_ => true, StartupTimeout);
        clock.Stop();
        if (!SamePath(directory, home))
        {
            throw new InvalidOperationException($"Dossier initial inattendu : {directory}");
        }

        return $"PID {probe.Session.ProcessId}, premier prompt après {clock.ElapsedMilliseconds} ms, dossier {directory}, {probe.AnsweredQueries} requête(s) DA1/DSR du terminal";
    }

    private static async Task<string> ProfileAsync(ShellProbe probe)
    {
        probe.ClearTranscript();
        probe.SendLine("Write-Host ('DOCKPROBE|' + [bool](Get-Command wtr -ErrorAction SilentlyContinue) + '|' + [bool](Get-Command rmwt -ErrorAction SilentlyContinue) + '|' + [bool]$env:POSH_SHELL_VERSION + '|' + [string]::IsNullOrEmpty($env:WEZTERM_EXECUTABLE) + '|' + $env:DOCK_TERMINAL + '|' + $env:DOCK_PANE_ID + '|' + $PSVersionTable.PSVersion + '|END')");
        var match = await probe.WaitForAsync(new Regex(@"DOCKPROBE\|(True|False)\|(True|False)\|(True|False)\|(True|False)\|(\S*?)\|(\S*?)\|(\S*?)\|END"), CommandTimeout);
        var wtr = match.Groups[1].Value == "True";
        var rmwt = match.Groups[2].Value == "True";
        var poshLoaded = match.Groups[3].Value == "True";
        var noWezterm = match.Groups[4].Value == "True";
        var dockFlag = match.Groups[5].Value;
        var paneId = match.Groups[6].Value;
        var version = match.Groups[7].Value;
        if (!wtr || !rmwt || !poshLoaded || !noWezterm || dockFlag != "1" || paneId != probe.Session.PaneId)
        {
            throw new InvalidOperationException($"wtr={wtr} rmwt={rmwt} oh-my-posh={poshLoaded} sansWezTerm={noWezterm} DOCK_TERMINAL={dockFlag} DOCK_PANE_ID={paneId}");
        }

        return $"PowerShell {version}, wtr/rmwt présents, oh-my-posh chargé, DOCK_PANE_ID={paneId}, WEZTERM_EXECUTABLE absent";
    }

    private static async Task<string> ChangeDirectoryAsync(ShellProbe probe)
    {
        var target = Environment.GetFolderPath(Environment.SpecialFolder.System);
        var clock = Stopwatch.StartNew();
        probe.SendLine($"Set-Location '{target}'");
        var directory = await probe.WaitForDirectoryAsync(current => SamePath(current, target), CommandTimeout);
        return $"{directory} reçu après {clock.ElapsedMilliseconds} ms";
    }

    private static async Task<string> FunctionDirectoryAsync(ShellProbe probe)
    {
        var target = Path.GetTempPath();
        var clock = Stopwatch.StartNew();
        probe.SendLine("function global:__dockcd { Set-Location $env:TEMP }; __dockcd");
        var directory = await probe.WaitForDirectoryAsync(current => SamePath(current, target), CommandTimeout);
        return $"{directory} reçu après {clock.ElapsedMilliseconds} ms";
    }

    private static async Task<string> ResizeAsync(ShellProbe probe)
    {
        var clock = Stopwatch.StartNew();
        probe.Session.Resize(100, 40);
        var resizeMilliseconds = clock.Elapsed.TotalMilliseconds;
        probe.ClearTranscript();
        probe.SendLine("Write-Host ('DOCKSIZE|' + $Host.UI.RawUI.WindowSize.Width + 'x' + $Host.UI.RawUI.WindowSize.Height + '|END')");
        var match = await probe.WaitForAsync(new Regex(@"DOCKSIZE\|(\d+)x(\d+)\|END"), CommandTimeout);
        if (match.Groups[1].Value != "100" || match.Groups[2].Value != "40")
        {
            throw new InvalidOperationException($"Taille vue par le shell : {match.Groups[1].Value}x{match.Groups[2].Value}");
        }

        probe.Session.Resize(120, 30);
        return $"100x40 vu par le shell, appel ResizePseudoConsole en {resizeMilliseconds:F1} ms";
    }

    private static async Task<string> ThroughputAsync(ShellProbe probe)
    {
        probe.ClearTranscript();
        var before = probe.Session.BytesRead;
        var clock = Stopwatch.StartNew();
        probe.SendLine("& { $s = ('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEF' + \"`n\"); $b = [Text.Encoding]::UTF8.GetBytes($s * 1024); $o = [Console]::OpenStandardOutput(); for ($i = 0; $i -lt " + BenchBlocks + ") { $o.Write($b, 0, $b.Length); $i++ }; $o.Flush(); Write-Host ('DOCKBENCH|' + 'END') }");
        await probe.WaitForAsync(new Regex(@"DOCKBENCH\|END\s*$", RegexOptions.Multiline), BenchTimeout);
        clock.Stop();
        var bytes = probe.Session.BytesRead - before;
        var megabytes = bytes / 1024.0 / 1024.0;
        return $"{megabytes:F1} Mo lus depuis ConPTY en {clock.Elapsed.TotalSeconds:F2} s ({megabytes / clock.Elapsed.TotalSeconds:F1} Mo/s)";
    }

    private static async Task<string> JobObjectAsync(ShellProbe probe)
    {
        probe.ClearTranscript();
        probe.SendLine("Start-Process cmd -WindowStyle Hidden -ArgumentList '/c','start /b ping -t 127.0.0.1 > nul & ping -t 127.0.0.1 > nul'; Start-Sleep -Milliseconds 1500; Write-Host ('DOCKJOB|' + 'END')");
        await probe.WaitForAsync(new Regex(@"DOCKJOB\|END"), CommandTimeout);
        var processIds = probe.Session.JobProcessIds();
        if (processIds.Count < 3)
        {
            throw new InvalidOperationException($"Arbre de processus trop court dans le Job Object : {processIds.Count} processus");
        }

        probe.Session.Close();
        await Task.Delay(TimeSpan.FromSeconds(2));
        var survivors = processIds.Where(IsAlive).ToList();
        if (survivors.Count > 0)
        {
            throw new InvalidOperationException($"Processus survivants : {string.Join(", ", survivors)}");
        }

        return $"{processIds.Count} processus dans le Job (PID {string.Join(", ", processIds)}), tous terminés après fermeture du pane";
    }

    private static bool IsAlive(int processId)
    {
        try
        {
            using var process = Process.GetProcessById(processId);
            return !process.HasExited;
        }
        catch (ArgumentException)
        {
            return false;
        }
    }

    private static bool SamePath(string left, string right) =>
        string.Equals(Path.TrimEndingDirectorySeparator(Path.GetFullPath(left)), Path.TrimEndingDirectorySeparator(Path.GetFullPath(right)), StringComparison.OrdinalIgnoreCase);
}
