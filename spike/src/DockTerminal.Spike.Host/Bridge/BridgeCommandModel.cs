namespace DockTerminal.Spike.Host.Bridge;

public sealed class BridgeCommandModel
{
    public required string Type { get; init; }
    public string? Pane { get; init; }
    public string? Data { get; init; }
    public string? Provider { get; init; }
    public int Cols { get; init; }
    public int Rows { get; init; }
    public int Chars { get; init; }
    public int Blocks { get; init; }
    public bool Enabled { get; init; }
}
