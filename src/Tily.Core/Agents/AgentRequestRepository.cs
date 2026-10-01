using System.Text;
using System.Text.Json;
using Tily.Core.Session;
using static Tily.Core.Agents.JsonFields;

namespace Tily.Core.Agents;

public sealed class AgentRequestRepository
{
    public const string QuestionTool = "AskUserQuestion";

    private static readonly Dictionary<string, string> Destinations = new()
    {
        ["session"] = "cette session",
        ["localSettings"] = "ce projet",
        ["projectSettings"] = "ce projet, partagé",
        ["userSettings"] = "tous les projets"
    };

    public AgentRequestRepository(string agentsDirectory)
    {
        Directory = agentsDirectory;
    }

    public string Directory { get; }

    public string RequestPathFor(string paneId) => Path.Combine(Directory, paneId + ".request.json");

    public string AnswerPathFor(string paneId) => Path.Combine(Directory, paneId + ".answer.json");

    public AgentRequestModel? Read(string paneId, DateTime notBeforeUtc)
    {
        var path = RequestPathFor(paneId);
        if (!File.Exists(path) || File.GetLastWriteTimeUtc(path) < notBeforeUtc)
        {
            return null;
        }

        try
        {
            using var document = JsonDocument.Parse(File.ReadAllText(path, Encoding.UTF8));
            return Parse(document.RootElement);
        }
        catch (Exception exception) when (exception is JsonException or IOException or UnauthorizedAccessException)
        {
            return null;
        }
    }

    public void WithdrawOlderThan(string paneId, DateTime settledAtUtc)
    {
        var path = RequestPathFor(paneId);
        if (File.Exists(path) && File.GetLastWriteTimeUtc(path) < settledAtUtc)
        {
            TryDelete(path);
        }
    }

    public void Answer(string paneId, string requestId, string output) =>
        AtomicFile.Write(AnswerPathFor(paneId), requestId + "\n" + output + "\n");

    public void Forget(string paneId)
    {
        TryDelete(RequestPathFor(paneId));
        TryDelete(AnswerPathFor(paneId));
    }

    private static AgentRequestModel? Parse(JsonElement root)
    {
        var hook = Property(root, "hook");
        if (Text(root, "id") is not { } id || id.Length != 32 || !id.All(char.IsAsciiHexDigit) || Text(hook, "tool_name") is not { } tool)
        {
            return null;
        }

        if (tool == QuestionTool)
        {
            var questionsElement = Property(Property(hook, "tool_input"), "questions");
            var questions = questionsElement.ValueKind == JsonValueKind.Array ? questionsElement.EnumerateArray().Select(Question).OfType<AgentQuestionModel>().ToList() : [];
            var answerable = questions is [{ MultiSelect: false, Options.Count: > 0 }];
            return new AgentRequestModel(id, AgentRequestKind.Question, tool, null, questions, answerable) { QuestionsJson = answerable ? questionsElement.GetRawText() : null };
        }

        var suggestions = Property(hook, "permission_suggestions");
        var rule = suggestions.ValueKind == JsonValueKind.Array ? RuleLabel(suggestions) : null;
        return new AgentRequestModel(id, AgentRequestKind.Permission, tool, rule, [], true) { SuggestionsJson = rule is null ? null : suggestions.GetRawText() };
    }

    private static AgentQuestionModel? Question(JsonElement question)
    {
        if (Text(question, "question") is not { } text)
        {
            return null;
        }

        var optionsElement = Property(question, "options");
        var options = optionsElement.ValueKind == JsonValueKind.Array
            ? optionsElement.EnumerateArray().Where(option => Text(option, "label") is not null).Select(option => new AgentQuestionOptionModel(Text(option, "label")!, Text(option, "description"))).ToList()
            : [];
        return new AgentQuestionModel(text, Text(question, "header"), options, IsTrue(question, "multiSelect"));
    }

    private static string? RuleLabel(JsonElement suggestions)
    {
        var labels = suggestions.EnumerateArray().Select(SuggestionLabel).Where(label => !string.IsNullOrWhiteSpace(label)).ToList();
        return labels.Count == 0 ? null : string.Join(" ; ", labels);
    }

    private static string? SuggestionLabel(JsonElement suggestion)
    {
        var what = Text(suggestion, "type") switch
        {
            "addRules" or "replaceRules" => string.Join(", ", Items(suggestion, "rules").Select(RuleText).OfType<string>()),
            "addDirectories" => Items(suggestion, "directories").Any() ? "accès à " + string.Join(", ", Items(suggestion, "directories").Where(item => item.ValueKind == JsonValueKind.String).Select(item => item.GetString())) : null,
            "setMode" => Text(suggestion, "mode") is { } mode ? "mode " + mode : null,
            _ => null
        };
        return string.IsNullOrWhiteSpace(what) ? null : Text(suggestion, "destination") is { } destination && Destinations.TryGetValue(destination, out var where) ? $"{what} · {where}" : what;
    }

    private static IEnumerable<JsonElement> Items(JsonElement element, string name) =>
        Property(element, name) is { ValueKind: JsonValueKind.Array } items ? items.EnumerateArray() : [];

    private static string? RuleText(JsonElement rule) =>
        Text(rule, "toolName") is { } tool ? Text(rule, "ruleContent") is { } content ? $"{tool}({content})" : tool : null;

    private static void TryDelete(string path)
    {
        try
        {
            File.Delete(path);
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
        }
    }
}
