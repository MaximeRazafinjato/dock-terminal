namespace Tily.Core.Agents;

public sealed class AgentResponder
{
    public const string NoLongerWaiting = "La demande n’est plus en attente : rien n’a été envoyé à Claude Code.";
    public const string UnsupportedAnswer = "Cette réponse ne convient pas à la demande en attente : rien n’a été envoyé à Claude Code.";
    public const string NoAgent = "Aucun agent Claude Code dans ce terminal : rien n’a été envoyé.";
    public const string AnswerFirst = "Claude Code attend une réponse : répondez d’abord à sa demande, rien n’a été envoyé.";
    public const string EmptyMessage = "Message vide : rien n’a été envoyé.";

    private readonly AgentRequestRepository _requests;

    public AgentResponder(AgentRequestRepository requests)
    {
        _requests = requests;
    }

    public string? Respond(string paneId, PaneAgentModel? agent, AgentAnswerModel answer)
    {
        var request = agent is { State: AgentState.Waiting } ? agent.Request : null;
        if (request is null || request.Id != answer.RequestId)
        {
            return NoLongerWaiting;
        }

        var output = Decision(request, answer);
        if (output is null)
        {
            return UnsupportedAnswer;
        }

        _requests.Answer(paneId, request.Id, output);
        return null;
    }

    public static string? MessageError(PaneAgentModel? agent, string? message) =>
        agent is not { Agent: "claude" } ? NoAgent
        : agent.State == AgentState.Waiting ? AnswerFirst
        : string.IsNullOrWhiteSpace(message) ? EmptyMessage
        : null;

    private static string? Decision(AgentRequestModel request, AgentAnswerModel answer) =>
        (request.Kind, answer.Kind) switch
        {
            (AgentRequestKind.Permission, AgentAnswerKind.Allow) => PermissionDecisions.Allow(),
            (AgentRequestKind.Permission, AgentAnswerKind.Deny) => PermissionDecisions.Deny(answer.Message),
            (AgentRequestKind.Permission, AgentAnswerKind.Always) when request.SuggestionsJson is { } suggestions => PermissionDecisions.Always(suggestions),
            (AgentRequestKind.Question, AgentAnswerKind.Option) when request is { Answerable: true, QuestionsJson: { } questions } && request.Questions[0].Options.Any(option => option.Label == answer.Option) =>
                PermissionDecisions.Answer(questions, request.Questions[0].Question, answer.Option!),
            _ => null
        };
}
