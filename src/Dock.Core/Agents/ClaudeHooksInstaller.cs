using System.Text.Json;
using System.Text.Json.Nodes;
using Dock.Core.Session;

namespace Dock.Core.Agents;

public sealed record ClaudeHooksStatusModel(string SettingsFile, bool Installed);

public sealed class ClaudeHooksInstaller
{
    public static readonly IReadOnlyList<string> Events = ["SessionStart", "UserPromptSubmit", "PreToolUse", "PostToolUse", "PermissionRequest", "Notification", "Stop", "StopFailure", "SessionEnd"];
    private static readonly Dictionary<string, string> Matchers = new() { ["PreToolUse"] = "AskUserQuestion" };
    private const int HookTimeoutSeconds = 5;
    private static readonly JsonDocumentOptions ReadOptions = new() { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true };
    private static readonly JsonSerializerOptions WriteOptions = new() { WriteIndented = true, Encoder = SessionRepository.JsonOptions.Encoder };

    private readonly string _scriptPath;

    public ClaudeHooksInstaller(string scriptPath, string? settingsFile = null)
    {
        _scriptPath = scriptPath;
        SettingsFile = settingsFile ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".claude", "settings.json");
    }

    public string SettingsFile { get; }

    public ClaudeHooksStatusModel Status()
    {
        var root = Read();
        var hooks = root["hooks"] as JsonObject;
        var installed = hooks is not null && Events.All(eventName => GroupsOf(hooks, eventName).Any(IsDockGroup));
        return new ClaudeHooksStatusModel(SettingsFile, installed);
    }

    public ClaudeHooksStatusModel Install()
    {
        var root = Read();
        var hooks = root["hooks"] as JsonObject ?? new JsonObject();
        root["hooks"] = hooks;
        foreach (var eventName in Events)
        {
            var groups = hooks[eventName] as JsonArray ?? new JsonArray();
            hooks[eventName] = groups;
            foreach (var group in groups.OfType<JsonObject>().Where(IsDockGroup).ToList())
            {
                groups.Remove(group);
            }

            var dockGroup = new JsonObject();
            if (Matchers.TryGetValue(eventName, out var matcher))
            {
                dockGroup["matcher"] = matcher;
            }

            dockGroup["hooks"] = new JsonArray(DockHook());
            groups.Add(dockGroup);
        }

        Write(root);
        return new ClaudeHooksStatusModel(SettingsFile, true);
    }

    public bool RemoveIfPresent()
    {
        var root = Read();
        var present = root["hooks"] is JsonObject hooks && hooks.Select(pair => pair.Key).ToList().Any(eventName => GroupsOf(hooks, eventName).Any(IsDockGroup));
        if (present)
        {
            Remove();
        }

        return present;
    }

    public ClaudeHooksStatusModel Remove()
    {
        var root = Read();
        if (root["hooks"] is JsonObject hooks)
        {
            foreach (var eventName in hooks.Select(pair => pair.Key).ToList())
            {
                var groups = hooks[eventName] as JsonArray;
                if (groups is null)
                {
                    continue;
                }

                foreach (var group in groups.OfType<JsonObject>().Where(IsDockGroup).ToList())
                {
                    groups.Remove(group);
                }

                if (groups.Count == 0)
                {
                    hooks.Remove(eventName);
                }
            }

            if (hooks.Count == 0)
            {
                root.Remove("hooks");
            }

            Write(root);
        }

        return new ClaudeHooksStatusModel(SettingsFile, false);
    }

    private JsonObject DockHook() => new()
    {
        ["type"] = "command",
        ["command"] = "powershell.exe",
        ["args"] = new JsonArray("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", _scriptPath),
        ["timeout"] = HookTimeoutSeconds
    };

    private static IEnumerable<JsonObject> GroupsOf(JsonObject hooks, string eventName) =>
        (hooks[eventName] as JsonArray)?.OfType<JsonObject>() ?? [];

    private static bool IsDockGroup(JsonObject group) =>
        (group["hooks"] as JsonArray)?.OfType<JsonObject>().Any(IsDockHook) == true;

    private static bool IsDockHook(JsonObject hook) =>
        (hook["args"] as JsonArray)?.Any(argument => argument?.GetValueKind() == JsonValueKind.String && argument.GetValue<string>().EndsWith("dock-agent-state.ps1", StringComparison.OrdinalIgnoreCase)) == true;

    private JsonObject Read()
    {
        if (!File.Exists(SettingsFile))
        {
            return new JsonObject();
        }

        try
        {
            return JsonNode.Parse(File.ReadAllText(SettingsFile), null, ReadOptions) as JsonObject
                ?? throw new InvalidOperationException($"Le fichier {SettingsFile} ne contient pas un objet JSON.");
        }
        catch (JsonException exception)
        {
            throw new InvalidOperationException($"Le fichier {SettingsFile} est illisible : {exception.Message}");
        }
    }

    private void Write(JsonObject root)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(SettingsFile)!);
        AtomicFile.Write(SettingsFile, root.ToJsonString(WriteOptions));
    }
}
