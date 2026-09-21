using System.Text;

namespace DockTerminal.Spike.Core.Shell;

public static class PowerShellIntegration
{
    public const string WindowsPowerShellPath = @"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe";

    public const string PromptWrapperScript = """
        $global:__DockOriginalPrompt = $function:prompt
        function global:prompt {
            try {
                $dockPath = $PWD.ProviderPath
                if ($dockPath) {
                    $dockEsc = [char]27
                    $dockUri = ([System.Uri]$dockPath).AbsoluteUri
                    [Console]::Write("$dockEsc]7;$dockUri$dockEsc\")
                }
            } catch {}
            if ($global:__DockOriginalPrompt) { & $global:__DockOriginalPrompt } else { "PS $($PWD.Path)> " }
        }
        """;

    public static string BuildCommandLine()
    {
        var encoded = Convert.ToBase64String(Encoding.Unicode.GetBytes(PromptWrapperScript));
        return $"\"{WindowsPowerShellPath}\" -NoLogo -NoExit -EncodedCommand {encoded}";
    }
}
