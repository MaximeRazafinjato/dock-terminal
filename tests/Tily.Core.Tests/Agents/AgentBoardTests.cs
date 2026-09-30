using System.Text.Json;
using Tily.Core.Agents;
using Tily.Core.Session;
using Xunit;

namespace Tily.Core.Tests.Agents;

public sealed class AgentBoardTests : IDisposable
{
    private static readonly IReadOnlyDictionary<string, int> NoOrder = new Dictionary<string, int>();

    private readonly string _directory = Path.Combine(Path.GetTempPath(), "tily-tests-" + Guid.NewGuid().ToString("N"));
    private DateTimeOffset _now = new(2026, 9, 30, 22, 0, 0, TimeSpan.Zero);
    private readonly AgentBoard _board;

    public AgentBoardTests()
    {
        Directory.CreateDirectory(_directory);
        _board = new AgentBoard(() => _now);
    }

    [Fact]
    public void Build_WhenSeveralStates_ThenGroupsByUrgency()
    {
        var cards = _board.Build([Agent("done", AgentState.Done), Agent("unknown", AgentState.Unknown), Agent("working", AgentState.Working), Agent("error", AgentState.Error), Agent("waiting", AgentState.Waiting)], NoOrder);

        Assert.Equal(["waiting", "error", "working", "done", "unknown"], cards.Select(card => card.PaneId));
    }

    [Fact]
    public void Build_WhenSeveralWaiting_ThenOldestWaitFirst()
    {
        _board.Build([Agent("first", AgentState.Waiting), Agent("second", AgentState.Working)], NoOrder);
        _now = _now.AddMinutes(3);

        var cards = _board.Build([Agent("first", AgentState.Waiting), Agent("second", AgentState.Waiting)], NoOrder);

        Assert.Equal(["first", "second"], cards.Select(card => card.PaneId));
    }

    [Fact]
    public void Build_WhenSeveralDone_ThenMostRecentFirst()
    {
        _board.Build([Agent("early", AgentState.Done), Agent("late", AgentState.Working)], NoOrder);
        _now = _now.AddMinutes(3);

        var cards = _board.Build([Agent("early", AgentState.Done), Agent("late", AgentState.Done)], NoOrder);

        Assert.Equal(["late", "early"], cards.Select(card => card.PaneId));
    }

    [Fact]
    public void Build_WhenSameWaitingTime_ThenPanelOrderBreaksTie()
    {
        var cards = _board.Build([Agent("b", AgentState.Waiting), Agent("a", AgentState.Waiting)], new Dictionary<string, int> { ["a"] = 0, ["b"] = 1 });

        Assert.Equal(["a", "b"], cards.Select(card => card.PaneId));
    }

    [Fact]
    public void Build_WhenStateUnchanged_ThenKeepsSince()
    {
        var first = _board.Build([Agent("pane", AgentState.Working)], NoOrder).Single().Since;
        _now = _now.AddMinutes(5);

        var second = _board.Build([Agent("pane", AgentState.Working)], NoOrder).Single().Since;

        Assert.Equal(first, second);
    }

    [Fact]
    public void Build_WhenStateChanges_ThenSinceRestarts()
    {
        _board.Build([Agent("pane", AgentState.Working)], NoOrder);
        _now = _now.AddMinutes(5);

        var since = _board.Build([Agent("pane", AgentState.Waiting)], NoOrder).Single().Since;

        Assert.Equal(_now.ToUnixTimeMilliseconds(), since);
    }

    [Fact]
    public void Build_WhenWorkingWithTranscript_ThenCardSummarizesCurrentAction()
    {
        var transcript = WriteTranscript(
            new { type = "ai-title", aiTitle = "Vue Agents" },
            new { type = "assistant", message = new { id = "m1", model = "claude-opus-5-5", content = new object[] { new { type = "text", text = "Je lance les tests." }, new { type = "tool_use", id = "t1", name = "Bash", input = new { command = "pnpm test" } } }, usage = new { input_tokens = 1000 } } });

        var card = _board.Build([Agent("pane", AgentState.Working) with { TranscriptPath = transcript }], NoOrder).Single();

        Assert.Equal(("Vue Agents", "Bash : pnpm test", "Je lance les tests."), (card.Title, card.Summary, card.LastMessage));
    }

    [Fact]
    public void Build_WhenWaiting_ThenSummaryIsTheRequest()
    {
        var card = _board.Build([new PaneAgentModel("pane", "claude", AgentState.Waiting, "Autorisation demandée : Bash", "git push")], NoOrder).Single();

        Assert.Equal("Autorisation demandée : Bash — git push", card.Summary);
    }

    [Fact]
    public void Build_WhenDone_ThenSummaryIsFirstLineOfLastMessage()
    {
        var transcript = WriteTranscript(new { type = "assistant", message = new { id = "m1", model = "claude-opus-5-5", content = new[] { new { type = "text", text = "## Bilan\n\nTout est prêt." } } } });

        var card = _board.Build([Agent("pane", AgentState.Done) with { TranscriptPath = transcript }], NoOrder).Single();

        Assert.Equal("Bilan", card.Summary);
    }

    [Fact]
    public void PaneOrder_WhenWorkspacesWithSplits_ThenFollowsPanelOrder()
    {
        var session = new SessionModel
        {
            Workspaces =
            [
                new WorkspaceModel { Tabs = [new TabModel { Tree = new SplitNodeModel { A = Leaf("p1"), B = Leaf("p2") } }] },
                new WorkspaceModel { Tabs = [new TabModel { Tree = Leaf("p3") }] }
            ]
        };

        var order = AgentBoard.PaneOrder(session);

        Assert.Equal(["p1", "p2", "p3"], order.OrderBy(entry => entry.Value).Select(entry => entry.Key));
    }

    private static PaneAgentModel Agent(string paneId, AgentState state) => new(paneId, "claude", state, null);

    private static SplitNodeModel Leaf(string paneId) => new() { Pane = new PaneModel { Id = paneId } };

    private string WriteTranscript(params object[] entries)
    {
        var path = Path.Combine(_directory, Guid.NewGuid().ToString("N") + ".jsonl");
        File.WriteAllLines(path, entries.Select(entry => JsonSerializer.Serialize(entry)));
        return path;
    }

    public void Dispose()
    {
        if (Directory.Exists(_directory))
        {
            Directory.Delete(_directory, true);
        }
    }
}
