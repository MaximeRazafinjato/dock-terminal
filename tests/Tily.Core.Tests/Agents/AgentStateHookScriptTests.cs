using System.Diagnostics;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Xunit;

namespace Tily.Core.Tests.Agents;

public sealed class AgentStateHookScriptTests : IDisposable
{
    private const string PaneId = "pane-hook";

    private readonly string _directory = Path.Combine(Path.GetTempPath(), "tily-tests-" + Guid.NewGuid().ToString("N"));

    [Fact]
    public void Run_WhenBashPermissionRequested_ThenWritesCommandAsDetail()
    {
        var (state, _) = RunPermission("{ \"hook_event_name\": \"PermissionRequest\", \"tool_name\": \"Bash\", \"tool_input\": { \"command\": \"git push --force origin main\", \"description\": \"Pousser\" } }", null);

        Assert.Equal("Autorisation demandée : Bash", state["message"]!.GetValue<string>());
        Assert.Equal("git push --force origin main", state["detail"]!.GetValue<string>());
    }

    [Fact]
    public void Run_WhenPermissionAnsweredByTily_ThenPrintsTheDecision()
    {
        const string decision = "{\"hookSpecificOutput\":{\"hookEventName\":\"PermissionRequest\",\"decision\":{\"behavior\":\"deny\",\"message\":\"Pas sur main \\u00e0 cette heure\"}}}";

        var (_, output) = RunPermission("{ \"hook_event_name\": \"PermissionRequest\", \"tool_name\": \"Bash\", \"tool_input\": { \"command\": \"git push\" } }", decision);

        Assert.Equal(decision, output);
    }

    [Fact]
    public void Run_WhenPermissionWithdrawnByTily_ThenPrintsNothing()
    {
        var (_, output) = RunPermission("{ \"hook_event_name\": \"PermissionRequest\", \"tool_name\": \"Bash\", \"tool_input\": { \"command\": \"git push\" } }", null);

        Assert.Equal(string.Empty, output);
    }

    [Fact]
    public void Run_WhenQuestionReachesPermissionRequest_ThenMessageIsQuestion()
    {
        var (state, _) = RunPermission("{ \"hook_event_name\": \"PermissionRequest\", \"tool_name\": \"AskUserQuestion\", \"tool_input\": { \"questions\": [ { \"question\": \"Quelle couleur ?\", \"options\": [ { \"label\": \"Vert\" } ] } ] } }", null);

        Assert.Equal(("Question posée.", "Quelle couleur ?"), (state["message"]!.GetValue<string>(), state["detail"]!.GetValue<string>()));
    }

    [Fact]
    public void Run_WhenQuestionAsked_ThenWritesFirstQuestionWithAccents()
    {
        var state = Run("{ \"hook_event_name\": \"PreToolUse\", \"tool_name\": \"AskUserQuestion\", \"tool_input\": { \"questions\": [ { \"question\": \"Quelle stratégie adopter à l’étape 2 ?\" } ] } }");

        Assert.Equal("Quelle stratégie adopter à l’étape 2 ?", state["detail"]!.GetValue<string>());
    }

    [Fact]
    public void Run_WhenUnknownToolPermissionRequested_ThenWritesInputAsJson()
    {
        var (state, _) = RunPermission("{ \"hook_event_name\": \"PermissionRequest\", \"tool_name\": \"mcp__jira__create\", \"tool_input\": { \"summary\": \"Bug\" } }", null);

        Assert.Equal("{\"summary\":\"Bug\"}", state["detail"]!.GetValue<string>());
    }

    [Fact]
    public void Run_WhenStopped_ThenWritesLastAssistantTextFromTranscript()
    {
        Directory.CreateDirectory(_directory);
        var transcript = Path.Combine(_directory, "session.jsonl");
        File.WriteAllLines(transcript,
        [
            "{\"type\":\"user\",\"message\":{\"role\":\"user\",\"content\":\"Corrige le bug\"}}",
            "{\"isSidechain\":false,\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"Le bug est corrigé et testé.\"}]},\"type\":\"assistant\"}",
            "{\"isSidechain\":true,\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"Sous-agent\"}]},\"type\":\"assistant\"}",
            "{\"isSidechain\":false,\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"tool_use\",\"name\":\"Bash\"}]},\"type\":\"assistant\"}"
        ], new UTF8Encoding(false));

        var state = Run(JsonSerializer.Serialize(new Dictionary<string, string> { ["hook_event_name"] = "Stop", ["transcript_path"] = transcript }));

        Assert.Equal("done", state["state"]!.GetValue<string>());
        Assert.Equal("Le bug est corrigé et testé.", state["detail"]!.GetValue<string>());
    }

    [Fact]
    public void Run_WhenStoppedWithLastAssistantMessage_ThenPrefersIt()
    {
        var state = Run("{ \"hook_event_name\": \"Stop\", \"last_assistant_message\": \"Terminé : 3 fichiers modifiés.\", \"transcript_path\": \"C:\\\\absent.jsonl\" }");

        Assert.Equal("Terminé : 3 fichiers modifiés.", state["detail"]!.GetValue<string>());
    }

    private JsonNode Run(string payload)
    {
        var start = new ProcessStartInfo("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ScriptPath()])
        {
            RedirectStandardInput = true,
            UseShellExecute = false,
            CreateNoWindow = true,
            StandardInputEncoding = new UTF8Encoding(false)
        };
        start.Environment["TILY_PANE_ID"] = PaneId;
        start.Environment["TILY_DATA_DIR"] = _directory;

        using var process = Process.Start(start)!;
        process.StandardInput.Write(payload);
        process.StandardInput.Close();
        Assert.True(process.WaitForExit(TimeSpan.FromSeconds(30)), "Le script du hook n’a pas terminé dans le délai.");

        return JsonNode.Parse(File.ReadAllText(Path.Combine(_directory, "agents", PaneId + ".json"), Encoding.UTF8))!;
    }

    private (JsonNode State, string Output) RunPermission(string payload, string? decision)
    {
        var start = new ProcessStartInfo("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ScriptPath()])
        {
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            UseShellExecute = false,
            CreateNoWindow = true,
            StandardInputEncoding = new UTF8Encoding(false),
            StandardOutputEncoding = new UTF8Encoding(false)
        };
        start.Environment["TILY_PANE_ID"] = PaneId;
        start.Environment["TILY_DATA_DIR"] = _directory;
        var requestFile = Path.Combine(_directory, "agents", PaneId + ".request.json");

        using var process = Process.Start(start)!;
        process.StandardInput.Write(payload);
        process.StandardInput.Close();
        var output = process.StandardOutput.ReadToEndAsync();
        var waited = Stopwatch.StartNew();
        while (!File.Exists(requestFile) && waited.Elapsed < TimeSpan.FromSeconds(30))
        {
            Thread.Sleep(50);
        }

        var request = JsonNode.Parse(File.ReadAllText(requestFile, Encoding.UTF8))!;
        if (decision is null)
        {
            File.Delete(requestFile);
        }
        else
        {
            File.WriteAllText(Path.Combine(_directory, "agents", PaneId + ".answer.json"), request["id"]!.GetValue<string>() + "\n" + decision + "\n", new UTF8Encoding(false));
        }

        Assert.True(process.WaitForExit(TimeSpan.FromSeconds(30)), "Le script du hook n’a pas terminé dans le délai.");
        Assert.Equal(JsonNode.Parse(payload)!["tool_name"]!.GetValue<string>(), request["hook"]!["tool_name"]!.GetValue<string>());
        return (JsonNode.Parse(File.ReadAllText(Path.Combine(_directory, "agents", PaneId + ".json"), Encoding.UTF8))!, output.Result);
    }

    private static string ScriptPath()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "Tily.slnx")))
        {
            directory = directory.Parent;
        }

        return Path.Combine(directory?.FullName ?? throw new InvalidOperationException("Racine du dépôt introuvable."), "src", "Tily.Host", "hooks", "tily-agent-state.ps1");
    }

    public void Dispose()
    {
        if (Directory.Exists(_directory))
        {
            Directory.Delete(_directory, true);
        }
    }
}
