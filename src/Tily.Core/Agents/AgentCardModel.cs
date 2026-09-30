namespace Tily.Core.Agents;

public sealed record AgentCardModel(
    string PaneId,
    string Agent,
    AgentState State,
    long Since,
    string? Message,
    string? Detail,
    bool Interrupted,
    string? SessionId,
    string? Title,
    string? Summary,
    string? LastMessage,
    AgentActionModel? Action,
    IReadOnlyList<AgentFileChangeModel> Files,
    AgentContextModel? Context,
    AgentPullRequestModel? PullRequest,
    AgentRequestModel? Request);
