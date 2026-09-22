using Dock.Core.Agents;
using Dock.Core.Native;
using Microsoft.UI.Dispatching;
using Microsoft.Windows.AppNotifications;
using Microsoft.Windows.AppNotifications.Builder;

namespace Dock.Host.Bridge;

public sealed class AttentionNotifier : IDisposable
{
    private const string PaneArgument = "pane";

    private readonly DispatcherQueue _dispatcher;
    private readonly nint _windowHandle;
    private readonly Action<string> _join;
    private bool _registered;
    private string? _registrationError;

    public AttentionNotifier(DispatcherQueue dispatcher, nint windowHandle, Action<string> join)
    {
        _dispatcher = dispatcher;
        _windowHandle = windowHandle;
        _join = join;
    }

    public bool WindowActive { get; set; } = true;

    public object Describe() => new { toastAvailable = _registered, toastError = _registrationError };

    public void Register()
    {
        try
        {
            AppNotificationManager.Default.NotificationInvoked += HandleInvoked;
            AppNotificationManager.Default.Register();
            _registered = true;
        }
        catch (Exception exception)
        {
            _registered = false;
            _registrationError = exception.Message;
        }
    }

    public void Notify(string paneId, string title, string body, NotificationSettingsModel settings, bool force)
    {
        if (WindowActive && !force)
        {
            return;
        }

        if (settings.TaskbarFlash)
        {
            var info = new WindowApi.FlashInfo { Size = (uint)System.Runtime.InteropServices.Marshal.SizeOf<WindowApi.FlashInfo>(), WindowHandle = _windowHandle, Flags = WindowApi.FlashTray | WindowApi.FlashTimerNoForeground };
            WindowApi.FlashWindowEx(ref info);
        }

        var toastPlaysSound = settings.WindowsToast && _registered && !settings.UsesFile;
        if (settings.Sound != NotificationSettingsModel.NoSound && !toastPlaysSound)
        {
            var source = settings.UsesFile ? WindowApi.SoundFileName : WindowApi.SoundAlias;
            WindowApi.PlaySound(settings.Sound, 0, source | WindowApi.SoundAsync | WindowApi.SoundNoDefault);
        }

        if (!settings.WindowsToast || !_registered)
        {
            return;
        }

        var builder = new AppNotificationBuilder().AddArgument(PaneArgument, paneId).AddText(title).AddText(body);
        if (settings.Sound == NotificationSettingsModel.NoSound || settings.UsesFile)
        {
            builder.MuteAudio();
        }
        else
        {
            builder.SetAudioUri(new Uri($"ms-winsoundevent:{settings.Sound}"));
        }

        AppNotificationManager.Default.Show(builder.BuildNotification());
    }

    private void HandleInvoked(AppNotificationManager sender, AppNotificationActivatedEventArgs args)
    {
        if (!args.Arguments.TryGetValue(PaneArgument, out var paneId))
        {
            return;
        }

        _dispatcher.TryEnqueue(() =>
        {
            WindowApi.SetForegroundWindow(_windowHandle);
            _join(paneId);
        });
    }

    public void Dispose()
    {
        if (_registered)
        {
            AppNotificationManager.Default.NotificationInvoked -= HandleInvoked;
            AppNotificationManager.Default.Unregister();
        }
    }
}
