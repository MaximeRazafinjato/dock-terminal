namespace Tily.Core.Agents;

public sealed class ClaudeCodeAdapter : IAgentAdapter
{
    public const string InterruptedMessage = "Interrompu.";

    public static readonly TimeSpan InterruptionGrace = TimeSpan.FromSeconds(3);

    private readonly ClaudeSessionRegistry? _registry;
    private readonly AgentRequestRepository? _requests;
    private readonly Func<DateTime> _clock;

    public ClaudeCodeAdapter(ClaudeSessionRegistry? registry = null, AgentRequestRepository? requests = null, Func<DateTime>? clock = null)
    {
        _registry = registry;
        _requests = requests;
        _clock = clock ?? (() => DateTime.UtcNow);
    }

    public string Id => "claude";

    public PaneAgentModel? Detect(PaneProbeModel probe, AgentStateModel? reported)
    {
        var session = _registry?.Find(probe.ProcessIds ?? []);
        var (agent, settledAtUtc) = reported is not null && reported.Agent == Id
            ? Reconcile(new PaneAgentModel(probe.PaneId, Id, reported.State, reported.Message, reported.Detail), reported, session)
            : (session is not null || probe.Processes.Contains(Id, StringComparer.OrdinalIgnoreCase) ? new PaneAgentModel(probe.PaneId, Id, AgentState.Unknown, null) : null, DateTime.MinValue);
        if (agent is null)
        {
            return null;
        }

        agent = WithRequest(agent, probe, settledAtUtc);
        return session is null
            ? agent
            : agent with { SessionId = session.SessionId, SessionDirectory = session.Directory, TranscriptPath = _registry!.TranscriptPathFor(session) };
    }

    private PaneAgentModel WithRequest(PaneAgentModel agent, PaneProbeModel probe, DateTime settledAtUtc)
    {
        if (_requests is null)
        {
            return agent;
        }

        if (agent.State != AgentState.Waiting)
        {
            _requests.WithdrawOlderThan(probe.PaneId, settledAtUtc);
            return agent;
        }

        return _requests.Read(probe.PaneId, probe.StartedAtUtc) is { } request ? agent with { Request = request } : agent;
    }

    private (PaneAgentModel Agent, DateTime SettledAtUtc) Reconcile(PaneAgentModel agent, AgentStateModel reported, ClaudeSessionModel? session)
    {
        if (session?.StatusUpdatedAtUtc is not { } changedAtUtc || changedAtUtc <= reported.UpdatedAtUtc)
        {
            return (agent, reported.UpdatedAtUtc);
        }

        return (reported.State, session.Status) switch
        {
            (AgentState.Working or AgentState.Waiting, ClaudeSessionStatus.Idle) when _clock() - changedAtUtc >= InterruptionGrace => (agent with { State = AgentState.Done, Message = InterruptedMessage, Detail = null, Interrupted = true }, changedAtUtc),
            (AgentState.Waiting, ClaudeSessionStatus.Busy or ClaudeSessionStatus.Shell) => (agent with { State = AgentState.Working, Message = null, Detail = null }, changedAtUtc),
            _ => (agent, reported.UpdatedAtUtc)
        };
    }
}
