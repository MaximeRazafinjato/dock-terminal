namespace Tily.Core.Agents;

public sealed record AgentActionModel(string Tool, string? Target);

public sealed record AgentFileChangeModel(string Path, string Name, int Added, int Removed);

public sealed record AgentContextModel(long Tokens, long? Window, int? Percent);

public sealed record AgentPullRequestModel(int? Number, string Url, string? Repository);

public sealed record TranscriptSummaryModel(
    string? Title,
    string? LastMessage,
    AgentActionModel? Action,
    IReadOnlyList<AgentFileChangeModel> Files,
    AgentContextModel? Context,
    AgentPullRequestModel? PullRequest)
{
    public static readonly TranscriptSummaryModel Empty = new(null, null, null, [], null, null);
}
