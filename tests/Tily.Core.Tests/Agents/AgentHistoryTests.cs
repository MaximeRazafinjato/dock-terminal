using System.Text.Json;
using Tily.Core.Agents;
using Xunit;

namespace Tily.Core.Tests.Agents;

public sealed class AgentHistoryTests : IDisposable
{
    private const string SessionId = "3f2c8a51-6d0e-4b7a-9c1f-2e5d7a9b0c14";

    private static readonly DateTime Now = new(2026, 10, 1, 1, 0, 0, DateTimeKind.Utc);
    private static readonly IReadOnlyDictionary<string, string> Locations = new Dictionary<string, string> { ["pane-a"] = "Perso › api" };
    private static readonly IReadOnlySet<string> NoneLive = new HashSet<string>();

    private readonly string _directory = Path.Combine(Path.GetTempPath(), "tily-tests-" + Guid.NewGuid().ToString("N"));
    private readonly string _project;

    public AgentHistoryTests()
    {
        _project = Path.Combine(_directory, "projet");
        Directory.CreateDirectory(_project);
    }

    [Fact]
    public void Observe_WhenSessionSeen_ThenRecordsTitleLocationAndMessage()
    {
        var history = new AgentHistory(_directory);

        history.Observe([Agent(AgentState.Working)], [Card("Vue Agents", "Je lance les tests.")], Locations, Now);

        var item = history.Items(NoneLive, _ => true).Single();
        Assert.Equal(("Vue Agents", "Perso › api", "Je lance les tests.", _project), (item.Title, item.Location, item.LastMessage, item.Directory));
    }

    [Fact]
    public void Observe_WhenSessionDisappears_ThenEndsIt()
    {
        var history = new AgentHistory(_directory);
        history.Observe([Agent(AgentState.Done)], [Card("Titre", null)], Locations, Now);

        var changed = history.Observe([], [], Locations, Now.AddMinutes(5));

        Assert.Equal((true, new DateTimeOffset(Now).ToUnixTimeMilliseconds()), (changed, history.Items(NoneLive, _ => true).Single().EndedAt));
    }

    [Fact]
    public void Observe_WhenNothingChanges_ThenReportsNoChange()
    {
        var history = new AgentHistory(_directory);
        history.Observe([Agent(AgentState.Working)], [Card("Titre", "Message")], Locations, Now);

        var changed = history.Observe([Agent(AgentState.Working)], [Card("Titre", "Message")], Locations, Now.AddSeconds(2));

        Assert.False(changed);
    }

    [Fact]
    public void Observe_WhenMoreThanFiftySessions_ThenKeepsTheMostRecent()
    {
        var history = new AgentHistory(_directory);
        for (var index = 0; index < AgentHistory.MaxSessions + 3; index++)
        {
            history.Observe([Agent(AgentState.Done, Guid.NewGuid().ToString())], [], Locations, Now.AddMinutes(index));
        }

        var items = history.Items(NoneLive, _ => true);

        Assert.Equal((AgentHistory.MaxSessions, new DateTimeOffset(Now.AddMinutes(AgentHistory.MaxSessions + 2)).ToUnixTimeMilliseconds()), (items.Count, items[0].StartedAt));
    }

    [Fact]
    public void Load_WhenSessionWasAliveAtClose_ThenProposesResumeInItsPane()
    {
        var before = new AgentHistory(_directory);
        before.Observe([Agent(AgentState.Working)], [Card("Titre", null)], Locations, Now);
        before.Save();

        var item = new AgentHistory(_directory).Items(NoneLive, _ => true).Single();

        Assert.Equal((true, "pane-a", new DateTimeOffset(Now).ToUnixTimeMilliseconds()), (item.PendingResume, item.PaneId, item.EndedAt));
    }

    [Fact]
    public void DismissResume_WhenCommandTyped_ThenNoLongerProposed()
    {
        var before = new AgentHistory(_directory);
        before.Observe([Agent(AgentState.Working)], [], Locations, Now);
        before.Save();
        var history = new AgentHistory(_directory);

        var dismissed = history.DismissResume("pane-a");

        Assert.Equal((true, false), (dismissed, history.Items(NoneLive, _ => true).Single().PendingResume));
    }

    [Fact]
    public void Items_WhenDirectoryRemoved_ThenNotResumableWithReason()
    {
        var history = new AgentHistory(_directory);
        history.Observe([Agent(AgentState.Done)], [], Locations, Now);
        Directory.Delete(_project);

        var item = history.Items(NoneLive, _ => true).Single();

        Assert.Equal((false, AgentHistory.MissingDirectory), (item.Resumable, item.Reason));
    }

    [Fact]
    public void Items_WhenTranscriptErased_ThenNotResumableWithReason()
    {
        var history = new AgentHistory(_directory);
        history.Observe([Agent(AgentState.Done)], [], Locations, Now);

        var item = history.Items(NoneLive, _ => false).Single();

        Assert.Equal((false, AgentHistory.MissingTranscript), (item.Resumable, item.Reason));
    }

    [Fact]
    public void Resumable_WhenSessionRunning_ThenRefused()
    {
        var history = new AgentHistory(_directory);
        history.Observe([Agent(AgentState.Working)], [], Locations, Now);

        var (entry, error) = history.Resumable(SessionId, new HashSet<string> { SessionId }, _ => true);

        Assert.Equal((null, AgentHistory.AlreadyRunning), (entry, error));
    }

    [Fact]
    public void Resumable_WhenResumeJustPrepared_ThenRefused()
    {
        var history = new AgentHistory(_directory);
        history.Observe([Agent(AgentState.Done)], [], Locations, Now);
        history.Observe([], [], Locations, Now.AddMinutes(1));
        history.MarkResuming(SessionId, Now.AddMinutes(2));

        var (entry, error) = history.Resumable(SessionId, NoneLive, _ => true);

        Assert.Equal(((AgentHistoryEntryModel?)null, AgentHistory.ResumeInProgress, AgentHistory.ResumeInProgress), (entry, error, history.Items(NoneLive, _ => true).Single().Reason));
    }

    [Fact]
    public void Observe_WhenResumedSessionSeen_ThenResumableOnceEnded()
    {
        var history = new AgentHistory(_directory);
        history.Observe([Agent(AgentState.Done)], [], Locations, Now);
        history.Observe([], [], Locations, Now.AddMinutes(1));
        history.MarkResuming(SessionId, Now.AddMinutes(2));

        history.Observe([Agent(AgentState.Working)], [], Locations, Now.AddMinutes(2).AddSeconds(5));
        history.Observe([], [], Locations, Now.AddMinutes(2).AddSeconds(10));

        Assert.NotNull(history.Resumable(SessionId, NoneLive, _ => true).Entry);
    }

    [Fact]
    public void Observe_WhenResumeNeverStarted_ThenMarkExpires()
    {
        var history = new AgentHistory(_directory);
        history.Observe([Agent(AgentState.Done)], [], Locations, Now);
        history.Observe([], [], Locations, Now.AddMinutes(1));
        history.MarkResuming(SessionId, Now.AddMinutes(2));

        var changed = history.Observe([], [], Locations, Now.AddMinutes(2) + AgentHistory.ResumeWindow);

        Assert.Equal((true, true), (changed, history.Resumable(SessionId, NoneLive, _ => true).Entry is not null));
    }

    [Fact]
    public void Load_WhenFileUnreadable_ThenStartsEmptyAndKeepsTheFile()
    {
        File.WriteAllText(Path.Combine(_directory, "agent-history.json"), "{ pas du json");

        var history = new AgentHistory(_directory);

        Assert.Equal((0, true), (history.Items(NoneLive, _ => true).Count, history.LoadError?.Contains("mis de côté") == true));
    }

    [Fact]
    public void Load_WhenEntryIsNull_ThenSkipsIt()
    {
        File.WriteAllText(Path.Combine(_directory, "agent-history.json"), $$"""{ "sessions": [null, { "sessionId": "{{SessionId}}", "directory": {{JsonSerializer.Serialize(_project)}} }] }""");

        var history = new AgentHistory(_directory);

        Assert.Equal((SessionId, (string?)null), (history.Items(NoneLive, _ => true).Single().SessionId, history.LoadError));
    }

    private PaneAgentModel Agent(AgentState state, string sessionId = SessionId) =>
        new PaneAgentModel("pane-a", "claude", state, null) { SessionId = sessionId, SessionDirectory = _project };

    private static AgentCardModel Card(string? title, string? lastMessage) =>
        new("pane-a", "claude", AgentState.Working, 0, null, null, false, SessionId, title, null, lastMessage, null, [], null, null, null);

    public void Dispose()
    {
        if (Directory.Exists(_directory))
        {
            Directory.Delete(_directory, true);
        }
    }
}
