using Microsoft.UI.Xaml;

namespace DockTerminal.Spike.Host;

public partial class App : Application
{
    private Window? _window;

    public App()
    {
        Environment.SetEnvironmentVariable("WEBVIEW2_USER_DATA_FOLDER", Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "DockTerminalSpike", "WebView2"));
        InitializeComponent();
    }

    protected override void OnLaunched(LaunchActivatedEventArgs args)
    {
        _window = new MainWindow();
        _window.Activate();
    }
}
