using System.Text.Json;
using Tily.Core.Agents;
using Xunit;

namespace Tily.Core.Tests.Agents;

public sealed class AgentRequestRepositoryTests : IDisposable
{
    private const string PaneId = "pane-a";
    private const string RequestId = "0123456789abcdef0123456789abcdef";

    private readonly string _directory = Path.Combine(Path.GetTempPath(), "tily-tests-" + Guid.NewGuid().ToString("N"));
    private readonly AgentRequestRepository _requests;

    public AgentRequestRepositoryTests()
    {
        Directory.CreateDirectory(_directory);
        _requests = new AgentRequestRepository(_directory);
    }

    [Fact]
    public void Read_WhenPermissionWithRule_ThenShowsRuleAndDestination()
    {
        WriteRequest(new
        {
            tool_name = "Bash",
            tool_input = new { command = "ping -n 1 127.0.0.1" },
            permission_suggestions = new[] { new { type = "addRules", rules = new[] { new { toolName = "Bash", ruleContent = "ping -n 1 127.0.0.1" } }, behavior = "allow", destination = "localSettings" } }
        });

        var request = _requests.Read(PaneId, DateTime.MinValue);

        Assert.Equal((AgentRequestKind.Permission, "Bash(ping -n 1 127.0.0.1) · ce projet", true), (request?.Kind, request?.Rule, request?.Answerable));
    }

    [Fact]
    public void Read_WhenDirectorySuggestion_ThenDescribesAccess()
    {
        WriteRequest(new
        {
            tool_name = "Bash",
            tool_input = new { command = "echo x > a.txt" },
            permission_suggestions = new[] { new { type = "addDirectories", directories = new[] { @"C:\repo" }, destination = "session" } }
        });

        var rule = _requests.Read(PaneId, DateTime.MinValue)?.Rule;

        Assert.Equal(@"accès à C:\repo · cette session", rule);
    }

    [Fact]
    public void Read_WhenNoSuggestion_ThenNoRule()
    {
        WriteRequest(new { tool_name = "Write", tool_input = new { file_path = @"C:\repo\a.md" } });

        var request = _requests.Read(PaneId, DateTime.MinValue);

        Assert.Equal((AgentRequestKind.Permission, (string?)null, (string?)null), (request?.Kind, request?.Rule, request?.SuggestionsJson));
    }

    [Fact]
    public void Read_WhenSingleChoiceQuestion_ThenAnswerableWithOptions()
    {
        WriteRequest(new { tool_name = "AskUserQuestion", tool_input = new { questions = new[] { new { question = "Quelle couleur ?", header = "Couleur", options = new[] { new { label = "Rouge", description = "Chaud" }, new { label = "Vert", description = "Calme" } }, multiSelect = false } } } });

        var request = _requests.Read(PaneId, DateTime.MinValue);

        Assert.Equal((AgentRequestKind.Question, true, "Vert"), (request?.Kind, request?.Answerable, request?.Questions[0].Options[1].Label));
    }

    [Fact]
    public void Read_WhenMultiSelectQuestion_ThenNotAnswerable()
    {
        WriteRequest(new { tool_name = "AskUserQuestion", tool_input = new { questions = new[] { new { question = "Quelles couleurs ?", options = new[] { new { label = "Rouge" } }, multiSelect = true } } } });

        var answerable = _requests.Read(PaneId, DateTime.MinValue)?.Answerable;

        Assert.False(answerable);
    }

    [Fact]
    public void Read_WhenIdInvalid_ThenIgnored()
    {
        File.WriteAllText(_requests.RequestPathFor(PaneId), "{\"id\":\"..\\\\x\",\"hook\":{\"tool_name\":\"Bash\"}}");

        var request = _requests.Read(PaneId, DateTime.MinValue);

        Assert.Null(request);
    }

    [Fact]
    public void Read_WhenOlderThanShell_ThenIgnored()
    {
        WriteRequest(new { tool_name = "Bash" });

        var request = _requests.Read(PaneId, DateTime.UtcNow.AddMinutes(1));

        Assert.Null(request);
    }

    [Fact]
    public void WithdrawOlderThan_WhenRequestOlder_ThenDeletesIt()
    {
        WriteRequest(new { tool_name = "Bash" });
        File.SetLastWriteTimeUtc(_requests.RequestPathFor(PaneId), DateTime.UtcNow.AddSeconds(-10));

        _requests.WithdrawOlderThan(PaneId, DateTime.UtcNow);

        Assert.False(File.Exists(_requests.RequestPathFor(PaneId)));
    }

    [Fact]
    public void WithdrawOlderThan_WhenRequestNewer_ThenKeepsIt()
    {
        WriteRequest(new { tool_name = "Bash" });

        _requests.WithdrawOlderThan(PaneId, DateTime.UtcNow.AddSeconds(-10));

        Assert.True(File.Exists(_requests.RequestPathFor(PaneId)));
    }

    [Fact]
    public void Answer_WhenWritten_ThenFirstLineIsRequestIdAndSecondTheOutput()
    {
        _requests.Answer(PaneId, RequestId, "{\"a\":1}");

        var lines = File.ReadAllLines(_requests.AnswerPathFor(PaneId));

        Assert.Equal([RequestId, "{\"a\":1}"], lines);
    }

    private void WriteRequest(object hook) =>
        File.WriteAllText(_requests.RequestPathFor(PaneId), JsonSerializer.Serialize(new { id = RequestId, hook }));

    public void Dispose()
    {
        if (Directory.Exists(_directory))
        {
            Directory.Delete(_directory, true);
        }
    }
}
