using System.Text.Json;
using static Tily.Core.Agents.JsonFields;

namespace Tily.Core.Agents;

internal sealed class TranscriptAccumulator
{
    public const int MaxLastMessageLength = 100_000;
    public const int MaxFiles = 100;

    private static readonly string[] TargetFields = ["command", "file_path", "notebook_path", "url", "query", "pattern", "description", "skill"];

    private readonly string? _baseDirectory;
    private readonly List<string> _responseTexts = new();
    private readonly List<(string Id, AgentActionModel Action)> _pending = new();
    private readonly Dictionary<string, (int Added, int Removed, long Order)> _files = new(StringComparer.OrdinalIgnoreCase);
    private string? _customTitle;
    private string? _agentName;
    private string? _aiTitle;
    private string? _firstPrompt;
    private string? _lastPrompt;
    private string? _responseId;
    private string? _lastMessage;
    private string? _model;
    private long? _contextTokens;
    private long _fileOrder;
    private AgentPullRequestModel? _pullRequest;

    public TranscriptAccumulator(string? baseDirectory)
    {
        _baseDirectory = baseDirectory;
    }

    public void Apply(ReadOnlySpan<byte> line)
    {
        if (line.IsEmpty)
        {
            return;
        }

        JsonDocument document;
        try
        {
            var reader = new Utf8JsonReader(line);
            document = JsonDocument.ParseValue(ref reader);
        }
        catch (JsonException)
        {
            return;
        }

        using (document)
        {
            Apply(document.RootElement);
        }
    }

    public TranscriptSummaryModel Summary()
    {
        var title = _customTitle ?? _agentName ?? _aiTitle ?? _firstPrompt ?? _lastPrompt;
        var window = ModelContextWindows.For(_model);
        var context = _contextTokens is { } tokens
            ? new AgentContextModel(tokens, window, window is { } size ? (int)Math.Round(tokens * 100.0 / size) : null)
            : null;
        var files = _files
            .OrderByDescending(file => file.Value.Order)
            .Take(MaxFiles)
            .Select(file => new AgentFileChangeModel(file.Key, DisplayName(file.Key), file.Value.Added, file.Value.Removed))
            .ToList();
        return new TranscriptSummaryModel(AgentStateRepository.SingleLine(title), _lastMessage, _pending.Count > 0 ? _pending[^1].Action : null, files, context, _pullRequest);
    }

    private void Apply(JsonElement root)
    {
        switch (Text(root, "type"))
        {
            case "custom-title":
                _customTitle = Text(root, "customTitle") ?? _customTitle;
                break;
            case "agent-name":
                _agentName = Text(root, "agentName") ?? _agentName;
                break;
            case "ai-title":
                _aiTitle = Text(root, "aiTitle") ?? _aiTitle;
                break;
            case "last-prompt":
                _lastPrompt = Text(root, "lastPrompt") ?? _lastPrompt;
                break;
            case "pr-link" when Text(root, "prUrl") is { } url:
                _pullRequest = new AgentPullRequestModel(Property(root, "prNumber") is { ValueKind: JsonValueKind.Number } number && number.TryGetInt32(out var value) ? value : null, url, Text(root, "prRepository"));
                break;
            case "user" when !IsTrue(root, "isSidechain"):
                ApplyUser(root);
                break;
            case "assistant" when !IsTrue(root, "isSidechain"):
                ApplyAssistant(root);
                break;
        }
    }

    private void ApplyUser(JsonElement root)
    {
        var content = Property(Property(root, "message"), "content");
        var results = content.ValueKind == JsonValueKind.Array
            ? content.EnumerateArray().Where(block => Text(block, "type") == "tool_result").ToList()
            : [];
        if (results.Count > 0)
        {
            foreach (var result in results)
            {
                _pending.RemoveAll(pending => pending.Id == Text(result, "tool_use_id"));
            }

            ApplyFileChanges(Property(root, "toolUseResult"));
            return;
        }

        if (IsTrue(root, "isMeta") || IsTrue(root, "isCompactSummary") || PromptText(content) is not { } prompt)
        {
            return;
        }

        _pending.Clear();
        if (!prompt.StartsWith("[Request interrupted", StringComparison.Ordinal))
        {
            _firstPrompt ??= prompt;
        }
    }

    private void ApplyAssistant(JsonElement root)
    {
        var message = Property(root, "message");
        var model = Text(message, "model");
        if (message.ValueKind != JsonValueKind.Object || model == "<synthetic>")
        {
            return;
        }

        var id = Text(message, "id");
        if (id != _responseId)
        {
            _responseId = id;
            _responseTexts.Clear();
        }

        var content = Property(message, "content");
        if (content.ValueKind == JsonValueKind.Array)
        {
            foreach (var block in content.EnumerateArray())
            {
                ApplyBlock(block);
            }
        }

        var usage = Property(message, "usage");
        if (usage.ValueKind == JsonValueKind.Object)
        {
            _model = model ?? _model;
            _contextTokens = Number(usage, "input_tokens") + Number(usage, "cache_creation_input_tokens") + Number(usage, "cache_read_input_tokens");
        }
    }

    private void ApplyBlock(JsonElement block)
    {
        switch (Text(block, "type"))
        {
            case "text" when Text(block, "text") is { } text:
                _responseTexts.Add(text);
                var joined = string.Join("\n\n", _responseTexts);
                _lastMessage = joined.Length <= MaxLastMessageLength ? joined : joined[..MaxLastMessageLength] + "…";
                break;
            case "tool_use" when Text(block, "id") is { } toolId && Text(block, "name") is { } name:
                _pending.Add((toolId, new AgentActionModel(name, TargetOf(Property(block, "input")))));
                break;
        }
    }

    private void ApplyFileChanges(JsonElement result)
    {
        if (Text(result, "filePath") is { } path)
        {
            if (Text(result, "type") == "create")
            {
                Count(path, LineCount(Text(result, "content")), 0);
            }
            else if (Property(result, "structuredPatch") is { ValueKind: JsonValueKind.Array } patch)
            {
                Tally(path, patch);
            }
        }

        var files = Property(Property(result, "bashEditDiff"), "files");
        if (files.ValueKind != JsonValueKind.Array)
        {
            return;
        }

        foreach (var file in files.EnumerateArray())
        {
            if (Text(file, "filePath") is { } filePath && Property(file, "hunks") is { ValueKind: JsonValueKind.Array } hunks)
            {
                Tally(filePath, hunks);
            }
        }
    }

    private void Tally(string path, JsonElement hunks)
    {
        var added = 0;
        var removed = 0;
        foreach (var hunk in hunks.EnumerateArray())
        {
            var lines = Property(hunk, "lines");
            if (lines.ValueKind != JsonValueKind.Array)
            {
                continue;
            }

            foreach (var line in lines.EnumerateArray())
            {
                var text = line.ValueKind == JsonValueKind.String ? line.GetString() : null;
                if (text?.StartsWith('+') == true)
                {
                    added++;
                }
                else if (text?.StartsWith('-') == true)
                {
                    removed++;
                }
            }
        }

        Count(path, added, removed);
    }

    private void Count(string path, int added, int removed)
    {
        var (previousAdded, previousRemoved, _) = _files.TryGetValue(path, out var tally) ? tally : (0, 0, 0L);
        _files[path] = (previousAdded + added, previousRemoved + removed, ++_fileOrder);
    }

    private string DisplayName(string path)
    {
        if (string.IsNullOrWhiteSpace(_baseDirectory))
        {
            return path;
        }

        try
        {
            var relative = Path.GetRelativePath(_baseDirectory, path);
            return relative.StartsWith("..", StringComparison.Ordinal) || Path.IsPathRooted(relative) ? path : relative;
        }
        catch (ArgumentException)
        {
            return path;
        }
    }

    private static string? PromptText(JsonElement content)
    {
        var text = content.ValueKind switch
        {
            JsonValueKind.String => content.GetString(),
            JsonValueKind.Array => string.Join("\n", content.EnumerateArray().Where(block => Text(block, "type") == "text").Select(block => Text(block, "text"))),
            _ => null
        };
        var trimmed = text?.Trim();
        return string.IsNullOrEmpty(trimmed) || trimmed.StartsWith('<') ? null : trimmed;
    }

    private static string? TargetOf(JsonElement input)
    {
        if (input.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        var questions = Property(input, "questions");
        if (questions.ValueKind == JsonValueKind.Array && questions.GetArrayLength() > 0 && Text(questions[0], "question") is { } question)
        {
            return AgentStateRepository.SingleLine(question);
        }

        return TargetFields.Select(field => Text(input, field)).FirstOrDefault(value => value is not null) is { } target
            ? AgentStateRepository.SingleLine(target)
            : null;
    }

    private static int LineCount(string? content) =>
        string.IsNullOrEmpty(content) ? 0 : content.TrimEnd('\n').Split('\n').Length;
}
