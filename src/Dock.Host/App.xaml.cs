using Dock.Core.Agents;
using Microsoft.UI.Xaml;

namespace Dock.Host;

public partial class App : Application
{
    private const string RemoveClaudeHooksArgument = "--remove-claude-hooks";

    public static string DataDirectory { get; } = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Dock");

    private Window? _window;

    public App()
    {
        Environment.SetEnvironmentVariable("WEBVIEW2_USER_DATA_FOLDER", Path.Combine(DataDirectory, "WebView2"));
        InitializeComponent();
    }

    protected override void OnLaunched(LaunchActivatedEventArgs args)
    {
        if (Environment.GetCommandLineArgs().Contains(RemoveClaudeHooksArgument, StringComparer.OrdinalIgnoreCase))
        {
            RemoveClaudeHooks();
            Exit();
            return;
        }

        _window = new MainWindow();
        _window.Activate();
    }

    private static void RemoveClaudeHooks()
    {
        try
        {
            new ClaudeHooksInstaller(Path.Combine(AppContext.BaseDirectory, "hooks", "dock-agent-state.ps1")).RemoveIfPresent();
        }
        catch (Exception exception) when (exception is InvalidOperationException or IOException or UnauthorizedAccessException)
        {
        }
    }
}
