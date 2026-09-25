namespace Dock.Core.Git;

public static class GitOperationNames
{
    public static string Command(GitOperationKind operation) => operation switch
    {
        GitOperationKind.Merge => "merge",
        GitOperationKind.Rebase => "rebase",
        GitOperationKind.CherryPick => "cherry-pick",
        _ => "revert"
    };

    public static string Label(GitOperationKind operation) => operation switch
    {
        GitOperationKind.Merge => "Fusion",
        GitOperationKind.Rebase => "Rebase",
        GitOperationKind.CherryPick => "Cherry-pick",
        _ => "Revert"
    };

    public static string Finished(GitOperationKind operation) => operation == GitOperationKind.Merge ? "Fusion terminée." : $"{Label(operation)} terminé.";

    public static string Aborted(GitOperationKind operation) => operation == GitOperationKind.Merge ? "Fusion annulée." : $"{Label(operation)} annulé.";
}
