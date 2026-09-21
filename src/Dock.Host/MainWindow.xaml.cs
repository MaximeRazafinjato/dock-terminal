using Dock.Host.Bridge;
using Microsoft.UI.Xaml;
using Microsoft.Web.WebView2.Core;
using Windows.Graphics;

namespace Dock.Host;

public sealed partial class MainWindow : Window
{
    private const string VirtualHost = "dock.app";
    private const string DevServerVariable = "DOCK_WEB_DEV_URL";
    private readonly HostBridge _bridge;

    public MainWindow()
    {
        InitializeComponent();
        AppWindow.Resize(new SizeInt32(1480, 900));
        _bridge = new HostBridge(DispatcherQueue, App.DataDirectory, Close);
        Closed += HandleClosed;
        Activated += HandleActivated;
        _ = InitializeWebViewAsync();
    }

    private async Task InitializeWebViewAsync()
    {
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
