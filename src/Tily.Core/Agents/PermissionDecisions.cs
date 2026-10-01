using System.Text.Json.Nodes;

namespace Tily.Core.Agents;

public static class PermissionDecisions
{
    public const string DefaultDenyMessage = "Refusé depuis Tily.";

    public static string Allow() => Output(new JsonObject { ["behavior"] = "allow" });

    public static string Deny(string? reason) =>
        Output(new JsonObject { ["behavior"] = "deny", ["message"] = string.IsNullOrWhiteSpace(reason) ? DefaultDenyMessage : reason.Trim() });

    public static string Always(string suggestionsJson) =>
        Output(new JsonObject { ["behavior"] = "allow", ["updatedPermissions"] = JsonNode.Parse(suggestionsJson) });

    public static string Answer(string questionsJson, string question, string label) =>
        Output(new JsonObject
        {
            ["behavior"] = "allow",
            ["updatedInput"] = new JsonObject { ["questions"] = JsonNode.Parse(questionsJson), ["answers"] = new JsonObject { [question] = label } }
        });

    private static string Output(JsonObject decision) =>
        new JsonObject { ["hookSpecificOutput"] = new JsonObject { ["hookEventName"] = "PermissionRequest", ["decision"] = decision } }.ToJsonString();
}
