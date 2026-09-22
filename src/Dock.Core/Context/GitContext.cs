namespace Dock.Core.Context;

public sealed record GitContextModel(bool IsRepository, string? Branch, bool DetachedHead)
{
    public static readonly GitContextModel None = new(false, null, false);
}

public static class GitContext
{
    private const string GitEntry = ".git";
    private const string GitDirPrefix = "gitdir:";
    private const string RefPrefix = "ref: refs/heads/";

    public static GitContextModel Resolve(string path)
    {
        var gitDirectory = FindGitDirectory(path);
        if (gitDirectory is null)
        {
            return GitContextModel.None;
        }

        var headPath = Path.Combine(gitDirectory, "HEAD");
        if (!File.Exists(headPath))
        {
            return GitContextModel.None;
        }

        var head = File.ReadAllText(headPath).Trim();
        return head.StartsWith(RefPrefix, StringComparison.Ordinal)
            ? new GitContextModel(true, head[RefPrefix.Length..], false)
            : new GitContextModel(true, null, true);
    }

    private static string? FindGitDirectory(string path)
    {
        var current = Directory.Exists(path) ? new DirectoryInfo(path) : null;
        while (current is not null)
        {
            var entry = Path.Combine(current.FullName, GitEntry);
            if (Directory.Exists(entry))
            {
                return entry;
            }

            if (File.Exists(entry))
            {
                return ResolveGitFile(entry, current.FullName);
            }

            current = current.Parent;
        }

        return null;
    }

    private static string? ResolveGitFile(string gitFile, string baseDirectory)
    {
        var line = File.ReadLines(gitFile).FirstOrDefault(candidate => candidate.StartsWith(GitDirPrefix, StringComparison.Ordinal));
        if (line is null)
        {
            return null;
        }

        var target = line[GitDirPrefix.Length..].Trim();
        var resolved = Path.GetFullPath(Path.IsPathRooted(target) ? target : Path.Combine(baseDirectory, target));
        return Directory.Exists(resolved) ? resolved : null;
    }
}
