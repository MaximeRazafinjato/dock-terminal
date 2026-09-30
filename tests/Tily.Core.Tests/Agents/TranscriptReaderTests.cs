using System.Text;
using System.Text.Json;
using Tily.Core.Agents;
using Xunit;

namespace Tily.Core.Tests.Agents;

public sealed class TranscriptReaderTests : IDisposable
{
    private readonly string _directory = Path.Combine(Path.GetTempPath(), "tily-tests-" + Guid.NewGuid().ToString("N"));
    private readonly string _path;

    public TranscriptReaderTests()
    {
        Directory.CreateDirectory(_directory);
        _path = Path.Combine(_directory, "session.jsonl");
    }

    [Fact]
    public void Read_WhenRenamed_ThenCustomTitleWinsOverGeneratedTitle()
    {
        Append(Prompt("Corrige le bug du panneau"), new { type = "ai-title", aiTitle = "Bug du panneau" }, new { type = "custom-title", customTitle = "Panneau gauche" });

        var title = Reader().Read().Title;

        Assert.Equal("Panneau gauche", title);
    }

    [Fact]
    public void Read_WhenNoTitle_ThenFirstRealPromptIsUsed()
    {
        Append(Prompt("<command-name>/clear</command-name>"), Prompt("[Request interrupted by user]"), Prompt("Ajoute un test\npour le registre"), Prompt("Puis committe"));

        var title = Reader().Read().Title;

        Assert.Equal("Ajoute un test pour le registre", title);
    }

    [Fact]
    public void Read_WhenResponseSplitOverLines_ThenLastMessageJoinsItsTexts()
    {
        Append(Assistant("m1", Text("Ancienne réponse")), Assistant("m2", Text("## Bilan")), Assistant("m2", Text("Tout est **vert**.")));

        var message = Reader().Read().LastMessage;

        Assert.Equal("## Bilan\n\nTout est **vert**.", message);
    }

    [Fact]
    public void Read_WhenSidechainEntries_ThenIgnored()
    {
        Append(Assistant("m1", Text("Réponse principale")), new { type = "assistant", isSidechain = true, message = new { id = "m2", content = new[] { Text("Sous-agent") } } });

        var message = Reader().Read().LastMessage;

        Assert.Equal("Réponse principale", message);
    }

    [Fact]
    public void Read_WhenToolUsePending_ThenActionIsToolAndTarget()
    {
        Append(Assistant("m1", ToolUse("t1", "Read", new { file_path = @"C:\repo\a.ts" })), ToolResult("t1"), Assistant("m2", ToolUse("t2", "Bash", new { command = "pnpm test", description = "Tests" })));

        var action = Reader().Read().Action;

        Assert.Equal(new AgentActionModel("Bash", "pnpm test"), action);
    }

    [Fact]
    public void Read_WhenToolResultReceived_ThenNoActionLeft()
    {
        Append(Assistant("m1", ToolUse("t1", "Bash", new { command = "pnpm lint" })), ToolResult("t1"));

        var action = Reader().Read().Action;

        Assert.Null(action);
    }

    [Fact]
    public void Read_WhenFilesEdited_ThenCountsLinesPerFileMostRecentFirst()
    {
        Append(
            ToolResult("t1", new { filePath = @"C:\repo\src\a.ts", structuredPatch = new[] { new { lines = new[] { " x", "-old", "+new", "+more" } } } }),
            ToolResult("t2", new { type = "create", filePath = @"C:\repo\docs\b.md", content = "un\ndeux\ntrois\n", structuredPatch = Array.Empty<object>() }),
            ToolResult("t3", new { stdout = "", bashEditDiff = new { files = new[] { new { filePath = @"C:\repo\src\a.ts", hunks = new[] { new { lines = new[] { "-gone" } } } } } } }));

        var files = Reader(@"C:\repo").Read().Files;

        Assert.Equal(
            [new AgentFileChangeModel(@"C:\repo\src\a.ts", @"src\a.ts", 2, 2), new AgentFileChangeModel(@"C:\repo\docs\b.md", @"docs\b.md", 3, 0)],
            files);
    }

    [Fact]
    public void Read_WhenModelWindowKnown_ThenContextHasPercent()
    {
        Append(Assistant("m1", Text("ok"), "claude-haiku-4-5-20251001", new { input_tokens = 2, cache_creation_input_tokens = 18, cache_read_input_tokens = 49980, output_tokens = 900 }));

        var context = Reader().Read().Context;

        Assert.Equal(new AgentContextModel(50000, 200000, 25), context);
    }

    [Fact]
    public void Read_WhenModelWindowUnknown_ThenContextWithoutPercent()
    {
        Append(Assistant("m1", Text("ok"), "claude-inconnu", new { input_tokens = 1200 }));

        var context = Reader().Read().Context;

        Assert.Equal(new AgentContextModel(1200, null, null), context);
    }

    [Fact]
    public void Read_WhenPullRequestLinked_ThenKeepsLatestLink()
    {
        Append(
            new { type = "pr-link", prNumber = 12, prUrl = "https://github.com/o/r/pull/12", prRepository = "o/r" },
            new { type = "pr-link", prNumber = 13, prUrl = "https://github.com/o/r/pull/13", prRepository = "o/r" });

        var pullRequest = Reader().Read().PullRequest;

        Assert.Equal(new AgentPullRequestModel(13, "https://github.com/o/r/pull/13", "o/r"), pullRequest);
    }

    [Fact]
    public void Read_WhenLinesAppendedLater_ThenReadsThemIncludingACompletedPartialLine()
    {
        var reader = Reader();
        Append(Assistant("m1", Text("Premier")));
        reader.Read();
        var partial = JsonSerializer.Serialize(Assistant("m2", Text("Second")));
        File.AppendAllText(_path, partial[..20]);
        var beforeCompletion = reader.Read().LastMessage;
        File.AppendAllText(_path, partial[20..] + "\n");

        var afterCompletion = reader.Read().LastMessage;

        Assert.Equal(("Premier", "Second"), (beforeCompletion, afterCompletion));
    }

    [Fact]
    public void Read_WhenLineUnreadable_ThenIgnored()
    {
        File.WriteAllText(_path, "{ pas du json\n" + JsonSerializer.Serialize(Assistant("m1", Text("Lisible"))) + "\n");

        var message = Reader().Read().LastMessage;

        Assert.Equal("Lisible", message);
    }

    [Fact]
    public void Read_WhenFileRewrittenShorter_ThenStartsOver()
    {
        var reader = Reader();
        Append(Assistant("m1", Text("Une réponse assez longue pour dépasser la suivante")), new { type = "ai-title", aiTitle = "Ancien titre" });
        reader.Read();
        File.WriteAllText(_path, JsonSerializer.Serialize(Assistant("m9", Text("Nouveau"))) + "\n");

        var summary = reader.Read();

        Assert.Equal(("Nouveau", (string?)null), (summary.LastMessage, summary.Title));
    }

    [Fact]
    public void Read_WhenFileMissing_ThenEmptySummary()
    {
        var summary = Reader().Read();

        Assert.Equal((null, null, 0), (summary.Title, summary.LastMessage, summary.Files.Count));
    }

    private TranscriptReader Reader(string? baseDirectory = null) => new(_path, baseDirectory);

    private void Append(params object[] entries) =>
        File.AppendAllText(_path, string.Concat(entries.Select(entry => JsonSerializer.Serialize(entry) + "\n")), new UTF8Encoding(false));

    private static object Prompt(string text) => new { type = "user", promptId = "p", message = new { role = "user", content = text } };

    private static object Text(string text) => new { type = "text", text };

    private static object ToolUse(string id, string name, object input) => new { type = "tool_use", id, name, input };

    private static object Assistant(string id, object block, string model = "claude-opus-5-5", object? usage = null) =>
        new { type = "assistant", isSidechain = false, message = new { id, model, role = "assistant", content = new[] { block }, usage = usage ?? new { input_tokens = 1 } } };

    private static object ToolResult(string toolUseId, object? result = null) =>
        new { type = "user", message = new { role = "user", content = new[] { new { type = "tool_result", tool_use_id = toolUseId, content = "ok" } } }, toolUseResult = result ?? new { stdout = "ok" } };

    public void Dispose()
    {
        if (Directory.Exists(_directory))
        {
            Directory.Delete(_directory, true);
        }
    }
}
