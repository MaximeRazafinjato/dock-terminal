using Dock.Host.Bridge;
using Microsoft.UI.Xaml;
using Microsoft.Web.WebView2.Core;
using Windows.Graphics;
using Windows.UI;

namespace Dock.Host;

public sealed partial class MainWindow : Window
{
    private const string VirtualHost = "dock.app";
    private const string DevServerVariable = "DOCK_WEB_DEV_URL";
    private static readonly Color Paper = Color.FromArgb(255, 0x11, 0x17, 0x14);
    private static readonly Color Ink = Color.FromArgb(255, 0xE4, 0xEC, 0xE6);
    private static readonly Color Muted = Color.FromArgb(255, 0x8E, 0xA3, 0x93);
    private static readonly Color Hover = Color.FromArgb(255, 0x21, 0x2D, 0x25);
    private readonly HostBridge _bridge;

    public MainWindow()
    {
        InitializeComponent();
        AppWindow.Resize(new SizeInt32(1480, 900));
        ApplyDarkTitleBar();
        _bridge = new HostBridge(DispatcherQueue, App.DataDirectory, Close);
        Closed += HandleClosed;
        Activated += HandleActivated;
        _ = InitializeWebViewAsync();
    }

    private async Task InitializeWebViewAsync()
    {
        View.DefaultBackgroundColor = Paper;
        await View.EnsureCoreWebView2Async();
        var core = View.CoreWebView2;
        core.Settings.AreBrowserAcceleratorKeysEnabled = false;
        core.Settings.AreDefaultContextMenusEnabled = false;
        core.Settings.IsStatusBarEnabled = false;
        core.Settings.IsZoomControlEnabled = false;
        core.Settings.IsGeneralAutofillEnabled = false;
        core.Settings.IsPasswordAutosaveEnabled = false;
        core.PermissionRequested += HandlePermissionRequested;
        core.SetVirtualHostNameToFolderMapping(VirtualHost, Path.Combine(AppContext.BaseDirectory, "wwwroot"), CoreWebView2HostResourceAccessKind.Allow);
        _bridge.Attach(core);
        core.Navigate(ResolveStartUrl());
    }

    private void ApplyDarkTitleBar()
    {
        var titleBar = AppWindow.TitleBar;
        titleBar.BackgroundColor = Paper;
        titleBar.InactiveBackgroundColor = Paper;
        titleBar.ForegroundColor = Ink;
        titleBar.InactiveForegroundColor = Muted;
        titleBar.ButtonBackgroundColor = Paper;
        titleBar.ButtonInactiveBackgroundColor = Paper;
        titleBar.ButtonForegroundColor = Ink;
        titleBar.ButtonInactiveForegroundColor = Muted;
        titleBar.ButtonHoverBackgroundColor = Hover;
        titleBar.ButtonHoverForegroundColor = Ink;
    }

    private static string ResolveStartUrl()
    {
        var devServer = Environment.GetEnvironmentVariable(DevServerVariable);
        return string.IsNullOrWhiteSpace(devServer) ? $"https://{VirtualHost}/index.html" : devServer;
    }

    private static void HandlePermissionRequested(CoreWebView2 sender, CoreWebView2PermissionRequestedEventArgs args)
    {
        if (args.PermissionKind == CoreWebView2PermissionKind.ClipboardRead)
        {
            args.State = CoreWebView2PermissionState.Allow;
        }
    }

    private void HandleActivated(object sender, WindowActivatedEventArgs args)
    {
        if (args.WindowActivationState != WindowActivationState.Deactivated)
        {
            View.Focus(FocusState.Programmatic);
        }
    }

    private void HandleClosed(object sender, WindowEventArgs args) => _bridge.Dispose();
}
