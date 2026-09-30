namespace Tily.Core.Agents;

public sealed record ClaudeLaunchModel(string SessionId, string Command);

public static class ClaudeLaunchCommand
{
    public const string DefaultMode = "default";

    public static readonly IReadOnlyList<string> Modes = [DefaultMode, "plan", "acceptEdits"];

    public static ClaudeLaunchModel Prepare(string? mode, string? before, string shellId) => Prepare(Guid.NewGuid(), mode, before, shellId);

    public static string Resume(string sessionId) =>
        Guid.TryParse(sessionId, out var id) ? $"claude --resume {id:D}" : throw new InvalidOperationException($"Identifiant de session invalide : {sessionId}.");

    public static ClaudeLaunchModel Prepare(Guid sessionId, string? mode, string? before, string shellId)
    {
        var chosen = string.IsNullOrWhiteSpace(mode) ? DefaultMode : mode;
        if (!Modes.Contains(chosen))
        {
            throw new InvalidOperationException($"Mode de départ inconnu : {chosen}.");
        }

        var claude = $"claude --session-id {sessionId:D}" + (chosen == DefaultMode ? string.Empty : $" --permission-mode {chosen}");
        var command = string.IsNullOrWhiteSpace(before) ? claude : before.Trim() + (shellId == "cmd" ? " & " : "; ") + claude;
        return new ClaudeLaunchModel(sessionId.ToString("D"), command);
    }
}
