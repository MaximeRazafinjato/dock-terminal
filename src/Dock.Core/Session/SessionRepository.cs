using System.Text.Encodings.Web;
using System.Text.Json;

namespace Dock.Core.Session;

public sealed record SessionLoadResultModel(SessionModel? Session, string? Error);

public sealed class SessionRepository
{
    public static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        WriteIndented = true,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    };

    private readonly string _filePath;

    public SessionRepository(string directory)
    {
        Directory.CreateDirectory(directory);
        _filePath = Path.Combine(directory, "session.json");
    }

    public string FilePath => _filePath;

    public SessionLoadResultModel Load()
    {
        if (!File.Exists(_filePath))
        {
            return new SessionLoadResultModel(null, null);
        }

        string reason;
        try
        {
            var session = JsonSerializer.Deserialize<SessionModel>(File.ReadAllText(_filePath), JsonOptions);
            var result = SessionValidator.Validate(session);
            if (result.IsValid)
            {
                return new SessionLoadResultModel(session, null);
            }

            reason = result.Error ?? "Format de session incorrect.";
        }
        catch (JsonException)
        {
            reason = "JSON illisible.";
        }

        var kept = CorruptedFiles.Quarantine(_filePath);
        return new SessionLoadResultModel(null, $"La session enregistrée était inutilisable ({reason}) ; copie conservée dans {kept}. Une session de secours a été ouverte.");
    }

    public ValidationResultModel Save(SessionModel session)
    {
        var result = SessionValidator.Validate(session);
        if (!result.IsValid)
        {
            return result;
        }

        AtomicFile.Write(_filePath, JsonSerializer.Serialize(session, JsonOptions));
        return result;
    }
}
