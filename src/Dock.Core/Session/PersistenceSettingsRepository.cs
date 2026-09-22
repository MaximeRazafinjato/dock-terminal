using System.Text.Json;
using System.Text.Json.Serialization;

namespace Dock.Core.Session;

public sealed record PersistenceSettingsModel(int TextIntervalSeconds, int LinesPerPane, int MaxTextMebibytes)
{
    public const int MinTextIntervalSeconds = 5;
    public const int MaxTextIntervalSeconds = 600;
    public const int MinLinesPerPane = 500;
    public const int MaxLinesPerPane = 100_000;
    public const int MinTextMebibytes = 16;
    public const int MaxTextMebibytesLimit = 2048;

    public static readonly PersistenceSettingsModel Default = new(30, 10_000, 256);

    [JsonIgnore]
    public long MaxTextChars => (long)MaxTextMebibytes * 1024 * 1024;

    public PersistenceSettingsModel Clamped() => new(
        Math.Clamp(TextIntervalSeconds, MinTextIntervalSeconds, MaxTextIntervalSeconds),
        Math.Clamp(LinesPerPane, MinLinesPerPane, MaxLinesPerPane),
        Math.Clamp(MaxTextMebibytes, MinTextMebibytes, MaxTextMebibytesLimit));
}

public sealed class PersistenceSettingsRepository
{
    public const string FileName = "persistence.json";

    private readonly string _filePath;

    public PersistenceSettingsRepository(string directory)
    {
        Directory.CreateDirectory(directory);
        _filePath = Path.Combine(directory, FileName);
    }

    public string FilePath => _filePath;

    public void Save(PersistenceSettingsModel settings) => AtomicFile.Write(_filePath, JsonSerializer.Serialize(settings.Clamped(), SessionRepository.JsonOptions));

    public PersistenceSettingsModel Load()
    {
        if (!File.Exists(_filePath))
        {
            File.WriteAllText(_filePath, JsonSerializer.Serialize(PersistenceSettingsModel.Default, SessionRepository.JsonOptions));
            return PersistenceSettingsModel.Default;
        }

        try
        {
            var settings = JsonSerializer.Deserialize<PersistenceSettingsModel>(File.ReadAllText(_filePath), SessionRepository.JsonOptions);
            return settings?.Clamped() ?? PersistenceSettingsModel.Default;
        }
        catch (JsonException)
        {
            return PersistenceSettingsModel.Default;
        }
    }
}
