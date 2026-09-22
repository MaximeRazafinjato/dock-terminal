namespace Dock.Core.Agents;

public interface IAgentAdapter
{
    string Id { get; }
    string Name { get; }
    PaneAgentModel? Detect(PaneProbeModel probe, AgentStateModel? reported);
}
