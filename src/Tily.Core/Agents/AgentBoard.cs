using Tily.Core.Session;

namespace Tily.Core.Agents;

public sealed class AgentBoard
{
    private static readonly AgentState[] GroupOrder = [AgentState.Waiting, AgentState.Error, AgentState.Working, AgentState.Done, AgentState.Unknown];

    private readonly Dictionary<string, TranscriptReader> _readers = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, (string Key, long Since)> _since = new();
    private readonly Func<DateTimeOffset> _clock;

    public AgentBoard(Func<DateTimeOffset>? clock = null)
    {
        _clock = clock ?? (() => DateTimeOffset.UtcNow);
    }

    public static IReadOnlyDictionary<string, int> PaneOrder(SessionModel session)
    {
        var order = new Dictionary<string, int>();
        foreach (var pane in session.Workspaces.SelectMany(workspace => workspace.Tabs).SelectMany(tab => SplitTree.Panes(tab.Tree)))
        {
            order.TryAdd(pane.Id, order.Count);
        }

        return order;
    }

    public static IReadOnlyDictionary<string, string> PaneLocations(SessionModel session)
    {
        var locations = new Dictionary<string, string>();
        foreach (var workspace in session.Workspaces)
        {
            foreach (var tab in workspace.Tabs)
            {
                foreach (var pane in SplitTree.Panes(tab.Tree))
                {
                    locations.TryAdd(pane.Id, $"{workspace.Name} › {tab.Name}");
                }
            }
        }

        return locations;
    }

    public IReadOnlyList<AgentCardModel> Build(IReadOnlyList<PaneAgentModel> agents, IReadOnlyDictionary<string, int> paneOrder)
    {
        var now = _clock().ToUnixTimeMilliseconds();
        var cards = agents.Select(agent => Card(agent, SinceOf(agent, now), SummaryOf(agent))).ToList();
        foreach (var paneId in _since.Keys.Where(paneId => agents.All(agent => agent.PaneId != paneId)).ToList())
        {
            _since.Remove(paneId);
        }

        foreach (var path in _readers.Keys.Where(path => agents.All(agent => !string.Equals(agent.TranscriptPath, path, StringComparison.OrdinalIgnoreCase))).ToList())
        {
            _readers.Remove(path);
        }

        return cards
            .OrderBy(card => Array.IndexOf(GroupOrder, card.State))
            .ThenBy(card => card.State is AgentState.Waiting or AgentState.Error ? card.Since : -card.Since)
            .ThenBy(card => paneOrder.TryGetValue(card.PaneId, out var rank) ? rank : int.MaxValue)
            .ToList();
    }

    private long SinceOf(PaneAgentModel agent, long now)
    {
        var key = $"{agent.State}|{agent.Message}";
        if (_since.TryGetValue(agent.PaneId, out var known) && known.Key == key)
        {
            return known.Since;
        }

        _since[agent.PaneId] = (key, now);
        return now;
    }

    private TranscriptSummaryModel SummaryOf(PaneAgentModel agent)
    {
        if (agent.TranscriptPath is null)
        {
            return TranscriptSummaryModel.Empty;
        }

        if (!_readers.TryGetValue(agent.TranscriptPath, out var reader))
        {
            reader = new TranscriptReader(agent.TranscriptPath, agent.SessionDirectory);
            _readers[agent.TranscriptPath] = reader;
        }

        return reader.Read();
    }

    private static AgentCardModel Card(PaneAgentModel agent, long since, TranscriptSummaryModel transcript) =>
        new(
            agent.PaneId,
            agent.Agent,
            agent.State,
            since,
            agent.Message,
            agent.Detail,
            agent.Interrupted,
            agent.SessionId,
            transcript.Title,
            SummaryLine(agent, transcript),
            transcript.LastMessage,
            agent.State is AgentState.Working or AgentState.Waiting ? transcript.Action : null,
            transcript.Files,
            transcript.Context,
            transcript.PullRequest,
            agent.Request);

    private static string? SummaryLine(PaneAgentModel agent, TranscriptSummaryModel transcript) =>
        agent.State switch
        {
            AgentState.Waiting => Join(" — ", agent.Message, agent.Detail),
            AgentState.Error => agent.Message,
            AgentState.Working when transcript.Action is { } action => Join(" : ", action.Tool, action.Target),
            AgentState.Done when agent.Interrupted => agent.Message,
            _ => FirstLine(transcript.LastMessage) ?? agent.Detail
        };

    private static string? Join(string separator, params string?[] parts)
    {
        var present = parts.Where(part => !string.IsNullOrWhiteSpace(part)).ToList();
        return present.Count == 0 ? null : string.Join(separator, present);
    }

    private static string? FirstLine(string? markdown) =>
        markdown?
            .Split('\n')
            .Select(line => line.Trim().TrimStart('#', '>', '*', '-', ' ', '\t'))
            .FirstOrDefault(line => line.Length > 0) is { } line
            ? AgentStateRepository.SingleLine(line)
            : null;
}
