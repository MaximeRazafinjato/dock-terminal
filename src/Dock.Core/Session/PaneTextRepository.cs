using System.Text.Json;

namespace Dock.Core.Session;

public sealed record PaneTextLoadResultModel(Dictionary<string, string> Text, string? Error);

public sealed class PaneTextRepository
{
    public const string FileName = "text.json";

    private readonly string _filePath;
    private readonly long _maxChars;

    public PaneTextRepository(string directory, long maxChars)
    {
        Directory.CreateDirectory(directory);
        _filePath = Path.Combine(directory, FileName);
        _maxChars = maxChars;
    }

    public string FilePath => _filePath;

    public PaneTextLoadResultModel Load()
    {
        if (!File.Exists(_filePath))
        {
            return new PaneTextLoadResultModel(new Dictionary<string, string>(), null);
        }

        try
        {
            var text = JsonSerializer.Deserialize<Dictionary<string, string?>>(File.ReadAllText(_filePath), SessionRepository.JsonOptions);
            if (text is null)
            {
                throw new JsonException();
            }

            var cleaned = text.Where(pair => !string.IsNullOrEmpty(pair.Key) && pair.Value is not null).ToDictionary(pair => pair.Key, pair => pair.Value!);
            return new PaneTextLoadResultModel(Trim(cleaned), null);
        }
        catch (JsonException)
        {
            var kept = CorruptedFiles.Quarantine(_filePath);
            return new PaneTextLoadResultModel(new Dictionary<string, string>(), $"L’historique des terminaux était illisible ; copie conservée dans {kept}.");
        }
    }

    public Dictionary<string, string> Save(Dictionary<string, string> text)
    {
        var trimmed = Trim(text);
        var temporaryPath = _filePath + ".tmp";
        File.WriteAllText(temporaryPath, JsonSerializer.Serialize(trimmed, SessionRepository.JsonOptions));
        File.Move(temporaryPath, _filePath, true);
        return trimmed;
    }

    private Dictionary<string, string> Trim(Dictionary<string, string> text)
    {
        var kept = new Dictionary<string, string>();
        long total = 0;
        foreach (var pair in text)
        {
            total += pair.Value.Length;
            if (total > _maxChars)
            {
                break;
            }

            kept[pair.Key] = pair.Value;
        }

        return kept;
    }
}
