using System.Text.Json;

namespace Dock.Host.Bridge;

public sealed class BridgeCommandModel
{
    public required string Type { get; init; }
    public string? Pane { get; init; }
    public string? Data { get; init; }
    public string? Shell { get; init; }
    public string? Cwd { get; init; }
    public int Cols { get; init; }
    public int Rows { get; init; }
    public int Chars { get; init; }
    public JsonElement? Session { get; init; }
}
