namespace Dock.Core.Git;

public static class GitHistoryCommands
{
    public static GitOutcomeModel Merge(GitRepository repository, string? reference)
    {
        var target = GitNames.RequireRevision(reference);
        repository.RequireCommit(target);
        repository.RequireNoOperation();
        var before = repository.HeadSha() ?? throw new GitCommandException("Aucun commit sur la branche courante.", string.Empty);
        var branch = repository.CurrentBranch();
        var output = repository.Run("merge", "--no-edit", target);
        return Conclude(repository, output, new GitUndoRecordModel { Kind = GitUndoKind.Merge, Label = $"Fusion de « {target} »", HeadBefore = before, BranchBefore = branch },
            $"« {target} » fusionnée dans « {branch ?? "HEAD"} ».", "La fusion a échoué.", "Fusion interrompue");
    }

    public static GitOutcomeModel Rebase(GitRepository repository, string? reference)
    {
        var target = GitNames.RequireRevision(reference);
        repository.RequireCommit(target);
        repository.RequireNoOperation();
        var branch = repository.CurrentBranch() ?? throw new GitCommandException("HEAD détachée : basculez sur une branche avant de rebaser.", string.Empty);
        var before = repository.HeadSha() ?? throw new GitCommandException("Aucun commit sur la branche courante.", string.Empty);
        var output = repository.Run("rebase", target);
        return Conclude(repository, output, new GitUndoRecordModel { Kind = GitUndoKind.Rebase, Label = $"Rebase sur « {target} »", HeadBefore = before, BranchBefore = branch },
            $"« {branch} » rebasée sur « {target} ».", "Le rebase a échoué.", "Rebase interrompu");
    }

    public static GitOutcomeModel CherryPick(GitRepository repository, string? commit)
    {
        var sha = repository.RequireCommit(commit);
        repository.RequireNoOperation();
        var before = repository.HeadSha() ?? throw new GitCommandException("Aucun commit sur la branche courante.", string.Empty);
        var branch = repository.CurrentBranch();
        var isMerge = GitHistoryReader.Parents(repository.Read("rev-list", "--parents", "-n", "1", sha).Trim()).Count > 2;
        var output = isMerge ? repository.Run("cherry-pick", "-m", "1", sha) : repository.Run("cherry-pick", sha);
        return Conclude(repository, output, new GitUndoRecordModel { Kind = GitUndoKind.CherryPick, Label = $"Cherry-pick de {GitRepository.Short(sha)}", HeadBefore = before, BranchBefore = branch },
            $"Commit {GitRepository.Short(sha)} appliqué sur « {branch ?? "HEAD"} ».", "Le cherry-pick a échoué.", "Cherry-pick interrompu");
    }

    public static GitOutcomeModel Reset(GitRepository repository, string? commit, string? mode, bool confirmed)
    {
        var sha = repository.RequireCommit(commit);
        var kind = mode switch
        {
            "soft" => GitUndoKind.ResetSoft,
            "mixed" => GitUndoKind.ResetMixed,
            "hard" => GitUndoKind.ResetHard,
            _ => throw new GitCommandException($"Mode de reset inconnu : {mode}.", string.Empty)
        };
        if (kind == GitUndoKind.ResetHard)
        {
            GitPaths.RequireConfirmation(confirmed);
        }

        repository.RequireNoOperation();
        var before = repository.HeadSha() ?? throw new GitCommandException("Aucun commit sur la branche courante.", string.Empty);
        var branch = repository.CurrentBranch();
        var indexTree = kind == GitUndoKind.ResetMixed ? GitRepository.ValueOf(repository.Run("write-tree")) : null;
        var backup = kind == GitUndoKind.ResetHard ? GitRepository.ValueOf(repository.Run("stash", "create")) : null;
        GitRepository.Require(repository.Run("reset", $"--{mode}", "-q", sha), "Le reset a échoué.");
        var record = new GitUndoRecordModel
        {
            Kind = kind,
            Label = $"Reset {mode} vers {GitRepository.Short(sha)}",
            HeadBefore = before,
            HeadAfter = sha,
            BranchBefore = branch,
            BranchAfter = branch,
            IndexTree = indexTree,
            Backup = backup
        };
        return new GitOutcomeModel($"« {branch ?? "HEAD"} » ramenée à {GitRepository.Short(sha)} ({mode}).", Undo: record);
    }

    private static GitOutcomeModel Conclude(GitRepository repository, GitOutputModel output, GitUndoRecordModel pending, string success, string failure, string interrupted)
    {
        if (!output.Succeeded)
        {
            if (repository.Operation() is null)
            {
                throw new GitCommandException(failure, output.Details);
            }

            var conflicts = repository.Status().Conflicts.Count;
            return new GitOutcomeModel($"{interrupted} : {GitText.Count(conflicts, "fichier en conflit", "fichiers en conflit")}.", true, pending with { Pending = true });
        }

        var after = repository.HeadSha();
        if (after is null || after == pending.HeadBefore)
        {
            return new GitOutcomeModel("Déjà à jour : rien à faire.");
        }

        return new GitOutcomeModel(success, Undo: pending with { HeadAfter = after, BranchAfter = repository.CurrentBranch(), Published = repository.IsPublished(after) });
    }
}
