namespace Tily.Core.Agents;

public sealed class AgentHistoryEntryModel
{
    public string SessionId { get; set; } = string.Empty;
    public string Directory { get; set; } = string.Empty;
    public string? PaneId { get; set; }
    public string? Location { get; set; }
    public string? Title { get; set; }
    public DateTime StartedAtUtc { get; set; }
    public DateTime LastSeenAtUtc { get; set; }
    public DateTime? EndedAtUtc { get; set; }
    public string? LastMessage { get; set; }
    public List<AgentFileChangeModel> Files { get; set; } = new();
    public AgentState State { get; set; } = AgentState.Unknown;
    public bool PendingResume { get; set; }
}

public sealed class AgentHistoryDocumentModel
{
    public int Version { get; set; } = 1;
    public List<AgentHistoryEntryModel> Sessions { get; set; } = new();
}

public sealed record AgentHistoryItemModel(
    string SessionId,
    string Directory,
    string? PaneId,
    string? Location,
    string? Title,
    long StartedAt,
    long? EndedAt,
    string? LastMessage,
    IReadOnlyList<AgentFileChangeModel> Files,
    AgentState State,
    bool Live,
    bool PendingResume,
    bool Resumable,
    string? Reason);
