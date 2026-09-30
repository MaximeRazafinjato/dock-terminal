using System.Text.Json.Nodes;
using Tily.Core.Agents;
using Xunit;

namespace Tily.Core.Tests.Agents;

public sealed class AgentResponderTests : IDisposable
{
    private const string PaneId = "pane-a";
    private const string RequestId = "0123456789abcdef0123456789abcdef";
    private const string Suggestions = "[{\"type\":\"addRules\",\"rules\":[{\"toolName\":\"Bash\",\"ruleContent\":\"ping *\"}],\"behavior\":\"allow\",\"destination\":\"localSettings\"}]";
    private const string Questions = "[{\"question\":\"Quelle couleur préférée ?\",\"options\":[{\"label\":\"Rouge\"},{\"label\":\"Vert\"}],\"multiSelect\":false}]";

    private static readonly AgentRequestModel Permission = new(RequestId, AgentRequestKind.Permission, "Bash", "Bash(ping *) · ce projet", [], true) { SuggestionsJson = Suggestions };

    private static readonly AgentRequestModel Question =
        new(RequestId, AgentRequestKind.Question, "AskUserQuestion", null, [new AgentQuestionModel("Quelle couleur préférée ?", null, [new AgentQuestionOptionModel("Rouge", null), new AgentQuestionOptionModel("Vert", null)], false)], true) { QuestionsJson = Questions };

    private readonly string _directory = Path.Combine(Path.GetTempPath(), "tily-tests-" + Guid.NewGuid().ToString("N"));
    private readonly AgentRequestRepository _requests;
    private readonly AgentResponder _responder;

    public AgentResponderTests()
    {
        Directory.CreateDirectory(_directory);
        _requests = new AgentRequestRepository(_directory);
        _responder = new AgentResponder(_requests);
    }

    [Fact]
    public void Respond_WhenAllowed_ThenWritesAllowDecision()
    {
        _responder.Respond(PaneId, Waiting(Permission), new AgentAnswerModel(RequestId, AgentAnswerKind.Allow));

        Assert.Equal("allow", Decision()["behavior"]!.GetValue<string>());
    }

    [Fact]
    public void Respond_WhenDeniedWithReason_ThenReasonReachesClaudeInAscii()
    {
        _responder.Respond(PaneId, Waiting(Permission), new AgentAnswerModel(RequestId, AgentAnswerKind.Deny, "  Pas de réseau ici  "));

        var line = File.ReadAllLines(_requests.AnswerPathFor(PaneId))[1];
        Assert.Equal(("deny", "Pas de réseau ici", true), (Decision()["behavior"]!.GetValue<string>(), Decision()["message"]!.GetValue<string>(), line.All(char.IsAscii)));
    }

    [Fact]
    public void Respond_WhenDeniedWithoutReason_ThenDefaultMessage()
    {
        _responder.Respond(PaneId, Waiting(Permission), new AgentAnswerModel(RequestId, AgentAnswerKind.Deny));

        Assert.Equal(PermissionDecisions.DefaultDenyMessage, Decision()["message"]!.GetValue<string>());
    }

    [Fact]
    public void Respond_WhenAlways_ThenSendsSuggestedRules()
    {
        _responder.Respond(PaneId, Waiting(Permission), new AgentAnswerModel(RequestId, AgentAnswerKind.Always));

        Assert.Equal("ping *", Decision()["updatedPermissions"]![0]!["rules"]![0]!["ruleContent"]!.GetValue<string>());
    }

    [Fact]
    public void Respond_WhenOptionChosen_ThenAnswersTheQuestion()
    {
        _responder.Respond(PaneId, Waiting(Question), new AgentAnswerModel(RequestId, AgentAnswerKind.Option, Option: "Vert"));

        var input = Decision()["updatedInput"]!;
        Assert.Equal(("Vert", "Rouge"), (input["answers"]!["Quelle couleur préférée ?"]!.GetValue<string>(), input["questions"]![0]!["options"]![0]!["label"]!.GetValue<string>()));
    }

    [Fact]
    public void Respond_WhenOptionUnknown_ThenRefusesWithoutWriting()
    {
        var error = _responder.Respond(PaneId, Waiting(Question), new AgentAnswerModel(RequestId, AgentAnswerKind.Option, Option: "Bleu"));

        Assert.Equal((AgentResponder.UnsupportedAnswer, false), (error, File.Exists(_requests.AnswerPathFor(PaneId))));
    }

    [Fact]
    public void Respond_WhenAgentNoLongerWaiting_ThenRefusesWithoutWriting()
    {
        var error = _responder.Respond(PaneId, Waiting(Permission) with { State = AgentState.Working }, new AgentAnswerModel(RequestId, AgentAnswerKind.Allow));

        Assert.Equal((AgentResponder.NoLongerWaiting, false), (error, File.Exists(_requests.AnswerPathFor(PaneId))));
    }

    [Fact]
    public void Respond_WhenAnotherRequestIsPending_ThenRefuses()
    {
        var error = _responder.Respond(PaneId, Waiting(Permission with { Id = "fedcba9876543210fedcba9876543210" }), new AgentAnswerModel(RequestId, AgentAnswerKind.Allow));

        Assert.Equal(AgentResponder.NoLongerWaiting, error);
    }

    [Fact]
    public void MessageError_WhenAgentWaiting_ThenAsksToAnswerFirst()
    {
        var error = AgentResponder.MessageError(Waiting(Permission), "Continue");

        Assert.Equal(AgentResponder.AnswerFirst, error);
    }

    [Fact]
    public void MessageError_WhenAgentWorking_ThenAccepted()
    {
        var error = AgentResponder.MessageError(new PaneAgentModel(PaneId, "claude", AgentState.Working, null), "Ajoute aussi un test");

        Assert.Null(error);
    }

    [Fact]
    public void MessageError_WhenNoAgent_ThenRefused()
    {
        var error = AgentResponder.MessageError(null, "Bonjour");

        Assert.Equal(AgentResponder.NoAgent, error);
    }

    private static PaneAgentModel Waiting(AgentRequestModel request) =>
        new PaneAgentModel(PaneId, "claude", AgentState.Waiting, "Autorisation demandée : Bash", "ping") { Request = request };

    private JsonNode Decision() =>
        JsonNode.Parse(File.ReadAllLines(_requests.AnswerPathFor(PaneId))[1])!["hookSpecificOutput"]!["decision"]!;

    public void Dispose()
    {
        if (Directory.Exists(_directory))
        {
            Directory.Delete(_directory, true);
        }
    }
}
