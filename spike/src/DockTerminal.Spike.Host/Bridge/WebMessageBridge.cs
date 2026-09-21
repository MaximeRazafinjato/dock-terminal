using System.Collections.Concurrent;
using System.Diagnostics;
using System.Text;
using System.Text.Json;
using DockTerminal.Spike.Core.Native;
using DockTerminal.Spike.Core.Shell;
using DockTerminal.Spike.Core.Terminal;
using Microsoft.UI.Dispatching;
using Microsoft.Web.WebView2.Core;

namespace DockTerminal.Spike.Host.Bridge;

public sealed record StatsSnapshotModel(long PtyBytes, long BridgeChars, long Ticks);

public sealed class WebMessageBridge : IDisposable
{
    private const int MaxCharsPerMessage = 512 * 1024;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, PropertyNameCaseInsensitive = true };

    private readonly DispatcherQueue _dispatcher;
    private readonly Action _closeWindow;
    private readonly ConcurrentDictionary<string, PaneHost> _panes = new();
    private readonly DispatcherQueueTimer _statsTimer;
    private readonly Dictionary<string, StatsSnapshotModel> _lastStats = new();
    private CoreWebView2? _core;
    private int _flushScheduled;

    public WebMessageBridge(DispatcherQueue dispatcher, Action closeWindow)
    {
        _dispatcher = dispatcher;
        _closeWindow = closeWindow;
        _statsTimer = dispatcher.CreateTimer();
        _statsTimer.Interval = TimeSpan.FromMilliseconds(500);
        _statsTimer.Tick += (_, _) => PublishStats();
    }

    public void Attach(CoreWebView2 core)
    {
        _core = core;
        core.WebMessageReceived += (_, args) => Handle(args.WebMessageAsJson);
        _statsTimer.Start();
    }

    public void Handle(string json)
    {
        BridgeCommandModel? command;
        try
        {
            command = JsonSerializer.Deserialize<BridgeCommandModel>(json, JsonOptions);
        }
        catch (JsonException)
        {
            Post(new { type = "error", message = "Message du pont illisible." });
            return;
        }

        if (command is null)
        {
            return;
        }

        try
        {
            Dispatch(command);
        }
        catch (Exception exception)
        {
            Post(new { type = "error", pane = command.Pane, message = exception.Message });
        }
    }

    private void Dispatch(BridgeCommandModel command)
    {
        switch (command.Type)
        {
            case "ready":
                Post(new { type = "hello", embeddedAvailable = PseudoConsoleApi.IsEmbeddedAvailable(), os = Environment.OSVersion.Version.ToString(), runtime = Environment.Version.ToString(), webview = _core?.Environment.BrowserVersionString });
                break;
            case "create":
                CreatePane(command);
                break;
            case "input":
                RequirePane(command).Session.Write(Encoding.UTF8.GetBytes(command.Data ?? string.Empty));
                break;
            case "resize":
                RequirePane(command).Session.Resize(command.Cols, command.Rows);
                break;
            case "ack":
                RequirePane(command).Acknowledge(command.Chars);
                break;
            case "close":
                ClosePane(command.Pane);
                break;
            case "bench":
                StartBench(RequirePane(command), command.Blocks);
                break;
            case "sinkOnly":
                RequirePane(command).SinkOnly = command.Enabled;
                break;
            case "jobProcesses":
                Post(new { type = "jobProcesses", pane = command.Pane, pids = RequirePane(command).Session.JobProcessIds() });
                break;
            case "closeWindow":
                _closeWindow();
                break;
            case "log":
                File.AppendAllText(Path.Combine(Path.GetTempPath(), "dockspike-web.log"), $"{DateTime.Now:HH:mm:ss.fff} {command.Data}{Environment.NewLine}");
                break;
            default:
                Post(new { type = "error", pane = command.Pane, message = $"Commande inconnue : {command.Type}" });
                break;
        }
    }

    private void CreatePane(BridgeCommandModel command)
    {
        var paneId = command.Pane ?? throw new InvalidOperationException("Identifiant de pane manquant.");
        ClosePane(paneId);
        var provider = string.Equals(command.Provider, "embedded", StringComparison.OrdinalIgnoreCase) ? PseudoConsoleProvider.Embedded : PseudoConsoleProvider.Windows;
        var session = new TerminalSession(new TerminalSessionOptions
        {
            PaneId = paneId,
            Provider = provider,
            CommandLine = PowerShellIntegration.BuildCommandLine(),
            WorkingDirectory = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
            Columns = Math.Max(command.Cols, 20),
            Rows = Math.Max(command.Rows, 5)
        });
        var pane = new PaneHost(paneId, session, RequestFlush);
        _panes[paneId] = pane;
        session.CurrentDirectoryChanged += path => PostIfCurrent(pane, new { type = "cwd", pane = paneId, path });
        session.Exited += code => PostIfCurrent(pane, new { type = "exit", pane = paneId, code });
        Post(new { type = "created", pane = paneId, pid = session.ProcessId, provider = provider.ToString().ToLowerInvariant() });
    }

    private void ClosePane(string? paneId)
    {
        if (paneId is not null && _panes.TryRemove(paneId, out var pane))
        {
            pane.Dispose();
        }
    }

    private static void StartBench(PaneHost pane, int blocks)
    {
        pane.ResetCounters();
        var count = blocks <= 0 ? 64 : blocks;
        var script = "& { $s = ('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEF' + \"`n\"); $b = [Text.Encoding]::UTF8.GetBytes($s * 1024); $o = [Console]::OpenStandardOutput(); $w = [Diagnostics.Stopwatch]::StartNew(); for ($i = 0; $i -lt " + count + ") { $o.Write($b, 0, $b.Length); $i++ }; $o.Flush(); Write-Host ('DOCKBENCH ' + [Math]::Round($b.Length * " + count + " / 1MB, 1) + ' Mo écrits par le shell en ' + $w.ElapsedMilliseconds + ' ms') }\r";
        pane.Session.Write(Encoding.UTF8.GetBytes(script));
    }

    private PaneHost RequirePane(BridgeCommandModel command) =>
        command.Pane is not null && _panes.TryGetValue(command.Pane, out var pane)
            ? pane
            : throw new InvalidOperationException($"Pane inconnu : {command.Pane}");

    private void RequestFlush()
    {
        if (Interlocked.CompareExchange(ref _flushScheduled, 1, 0) == 0)
        {
            _dispatcher.TryEnqueue(DispatcherQueuePriority.High, Flush);
        }
    }

    private void Flush()
    {
        Interlocked.Exchange(ref _flushScheduled, 0);
        foreach (var pane in _panes.Values)
        {
            var text = pane.TakePending();
            if (text is null)
            {
                continue;
            }

            for (var offset = 0; offset < text.Length; offset += MaxCharsPerMessage)
            {
                var length = Math.Min(MaxCharsPerMessage, text.Length - offset);
                PostNow(new { type = "output", pane = pane.PaneId, data = text.Substring(offset, length) });
            }
        }
    }

    private void PublishStats()
    {
        var now = Stopwatch.GetTimestamp();
        foreach (var pane in _panes.Values)
        {
            var ptyBytes = pane.Session.BytesRead;
            var bridgeChars = pane.ForwardedChars;
            var previous = _lastStats.GetValueOrDefault(pane.PaneId) ?? new StatsSnapshotModel(ptyBytes, bridgeChars, now);
            var seconds = Math.Max((now - previous.Ticks) / (double)Stopwatch.Frequency, 0.001);
            _lastStats[pane.PaneId] = new StatsSnapshotModel(ptyBytes, bridgeChars, now);
            PostNow(new
            {
                type = "stats",
                pane = pane.PaneId,
                ptyBytes,
                ptyRate = (ptyBytes - previous.PtyBytes) / seconds,
                bridgeChars,
                bridgeRate = (bridgeChars - previous.BridgeChars) / seconds,
                messages = pane.Messages,
                unacked = pane.UnackedChars,
                sinkOnly = pane.SinkOnly
            });
        }
    }

    private void PostIfCurrent(PaneHost pane, object message)
    {
        if (_panes.TryGetValue(pane.PaneId, out var current) && ReferenceEquals(current, pane))
        {
            Post(message);
        }
    }

    private void Post(object message) => _dispatcher.TryEnqueue(() => PostNow(message));

    private void PostNow(object message) => _core?.PostWebMessageAsJson(JsonSerializer.Serialize(message, JsonOptions));

    public void Dispose()
    {
        _statsTimer.Stop();
        foreach (var paneId in _panes.Keys.ToList())
        {
            ClosePane(paneId);
        }
    }
}
