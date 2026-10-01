namespace Tily.Core.Agents;

public static class ModelContextWindows
{
    private static readonly (string Prefix, long Window)[] Windows =
    [
        ("claude-fable-5", 1_000_000),
        ("claude-mythos-5", 1_000_000),
        ("claude-opus-5", 1_000_000),
        ("claude-opus-4-8", 1_000_000),
        ("claude-opus-4-7", 1_000_000),
        ("claude-opus-4-6", 1_000_000),
        ("claude-sonnet-5", 1_000_000),
        ("claude-sonnet-4-6", 1_000_000),
        ("claude-haiku-4-5", 200_000)
    ];

    public static long? For(string? model)
    {
        if (string.IsNullOrWhiteSpace(model))
        {
            return null;
        }

        foreach (var (prefix, window) in Windows)
        {
            if (model.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                return window;
            }
        }

        return null;
    }
}
