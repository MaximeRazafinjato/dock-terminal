using System.Text.Json.Serialization;

namespace Tily.Core.Agents;

[JsonConverter(typeof(JsonStringEnumConverter<AgentRequestKind>))]
public enum AgentRequestKind
{
    [JsonStringEnumMemberName("permission")] Permission,
    [JsonStringEnumMemberName("question")] Question
}

public sealed record AgentQuestionOptionModel(string Label, string? Description);

public sealed record AgentQuestionModel(string Question, string? Header, IReadOnlyList<AgentQuestionOptionModel> Options, bool MultiSelect);

public sealed record AgentRequestModel(string Id, AgentRequestKind Kind, string Tool, string? Rule, IReadOnlyList<AgentQuestionModel> Questions, bool Answerable)
{
    [JsonIgnore]
    public string? SuggestionsJson { get; init; }

    [JsonIgnore]
    public string? QuestionsJson { get; init; }
}

[JsonConverter(typeof(JsonStringEnumConverter<AgentAnswerKind>))]
public enum AgentAnswerKind
{
    [JsonStringEnumMemberName("allow")] Allow,
    [JsonStringEnumMemberName("deny")] Deny,
    [JsonStringEnumMemberName("always")] Always,
    [JsonStringEnumMemberName("option")] Option
}

public sealed record AgentAnswerModel(string RequestId, AgentAnswerKind Kind, string? Message = null, string? Option = null);
