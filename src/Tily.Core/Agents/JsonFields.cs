using System.Text.Json;

namespace Tily.Core.Agents;

internal static class JsonFields
{
    public static JsonElement Property(JsonElement element, string name) =>
        element.ValueKind == JsonValueKind.Object && element.TryGetProperty(name, out var value) ? value : default;

    public static string? Text(JsonElement element, string name) =>
        Property(element, name) is { ValueKind: JsonValueKind.String } value && !string.IsNullOrWhiteSpace(value.GetString()) ? value.GetString() : null;

    public static bool IsTrue(JsonElement element, string name) => Property(element, name).ValueKind == JsonValueKind.True;

    public static long Number(JsonElement element, string name) =>
        Property(element, name) is { ValueKind: JsonValueKind.Number } value && value.TryGetInt64(out var number) ? number : 0;
}
