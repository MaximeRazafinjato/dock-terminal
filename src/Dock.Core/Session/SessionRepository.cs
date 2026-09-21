using System.Text.Encodings.Web;
using System.Text.Json;

namespace Dock.Core.Session;

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

    public SessionModel? Load()
    {
        if (!File.Exists(_filePath))
        {
            return null;
        }

        try
        {
            var session = JsonSerializer.Deserialize<SessionModel>(File.ReadAllText(_filePath), JsonOptions);
            return SessionValidator.Validate(session).IsValid ? session : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    public ValidationResultModel Save(SessionModel session)
    {
        var result = SessionValidator.Validate(session);
        if (!result.IsValid)
        {
            return result;
        }

        var temporaryPath = _filePath + ".tmp";
        File.WriteAllText(temporaryPath, JsonSerializer.Serialize(session, JsonOptions));
        File.Move(temporaryPath, _filePath, true);
        return result;
    }
}
