using System.Text.Json;
using Dock.Core.Session;

namespace Dock.Core.Agents;

public sealed record NotificationSettingsModel(bool WindowsToast, string Sound, bool TaskbarFlash)
{
    public const string NoSound = "none";
    public const string DefaultSound = "Notification.Default";
    public static readonly IReadOnlyList<string> Sounds = [NoSound, DefaultSound, "Notification.IM", "Notification.Mail", "Notification.Reminder", "Notification.SMS"];
    public static readonly NotificationSettingsModel Default = new(true, DefaultSound, true);

    public const string WavExtension = ".wav";

    public bool UsesFile => IsWavPath(Sound);

    public static bool IsWavPath(string sound) => Path.IsPathRooted(sound) && string.Equals(Path.GetExtension(sound), WavExtension, StringComparison.OrdinalIgnoreCase);

    public NotificationSettingsModel Normalized()
    {
        var trimmed = Sound.Trim();
        var alias = Sounds.FirstOrDefault(sound => string.Equals(sound, trimmed, StringComparison.OrdinalIgnoreCase));
        return this with { Sound = alias ?? (IsWavPath(trimmed) ? trimmed : DefaultSound) };
    }
}

public sealed class NotificationSettingsRepository
{
    public const string FileName = "notifications.json";

    private readonly string _filePath;

    public NotificationSettingsRepository(string directory)
    {
        Directory.CreateDirectory(directory);
        _filePath = Path.Combine(directory, FileName);
    }

    public string FilePath => _filePath;

    public void Save(NotificationSettingsModel settings) => AtomicFile.Write(_filePath, JsonSerializer.Serialize(settings.Normalized(), SessionRepository.JsonOptions));

    public NotificationSettingsModel Load()
    {
        if (!File.Exists(_filePath))
        {
            File.WriteAllText(_filePath, JsonSerializer.Serialize(NotificationSettingsModel.Default, SessionRepository.JsonOptions));
            return NotificationSettingsModel.Default;
        }

        try
        {
            var settings = JsonSerializer.Deserialize<NotificationSettingsModel>(File.ReadAllText(_filePath), SessionRepository.JsonOptions);
            return settings?.Normalized() ?? NotificationSettingsModel.Default;
        }
        catch (JsonException)
        {
            return NotificationSettingsModel.Default;
        }
    }
}
