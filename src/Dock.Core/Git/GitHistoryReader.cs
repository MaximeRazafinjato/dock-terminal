namespace Dock.Core.Git;

public static class GitHistoryReader
{
    public const int PageSize = 200;
    public const int MaxCommits = 10000;

    private const char Separator = '\u001f';
    private const string CommitFormat = "--format=%H%x1f%P%x1f%an%x1f%ae%x1f%at%x1f%s";

    public static GitHistoryModel Read(GitRepository repository, GitHistoryScope scope, int count, GitHeadModel head, GitRefsModel refs)
    {
        var limit = Math.Clamp(count, 1, MaxCommits);
        var revisions = Revisions(scope, head, refs);
        if (revisions.Count == 0)
        {
            return new GitHistoryModel(repository.Root, scope, [], false);
        }

        var arguments = new List<string> { "log", "-z", "--topo-order", "--no-show-signature", $"-n{limit + 1}", CommitFormat };
        arguments.AddRange(revisions);
        arguments.Add("--");
        var records = repository.Read(arguments.ToArray()).Split('\0', StringSplitOptions.RemoveEmptyEntries)
            .Select(record => record.Trim('\n').Split(Separator))
            .Where(fields => fields.Length >= 6)
            .ToList();
        var page = records.Take(limit).ToList();
        var nodes = page.Select(fields => new GitGraphNodeModel(fields[0], Parents(fields[1]))).ToList();
        var graph = GitGraph.Layout(nodes);
        var labels = Labels(head, refs);
        var commits = page.Select((fields, index) => new GitCommitModel(
            fields[0],
            nodes[index].Parents,
            fields[2],
            fields[3],
            long.TryParse(fields[4], out var date) ? date : 0,
            fields[5],
            labels.TryGetValue(fields[0], out var refLabels) ? refLabels : [],
            graph[index])).ToList();
        return new GitHistoryModel(repository.Root, scope, commits, records.Count > limit);
    }

    public static IReadOnlyList<string> Parents(string field) => field.Split(' ', StringSplitOptions.RemoveEmptyEntries);

    private static List<string> Revisions(GitHistoryScope scope, GitHeadModel head, GitRefsModel refs)
    {
        if (scope == GitHistoryScope.All)
        {
            var all = new List<string> { "--branches", "--remotes", "--tags" };
            if (!head.Unborn)
            {
                all.Add("HEAD");
            }

            return all;
        }

        var current = new List<string>();
        if (!head.Unborn)
        {
            current.Add("HEAD");
        }

        if (!head.Unborn && refs.RemoteBranches.Any(branch => branch.Name == head.Upstream))
        {
            current.Add($"refs/remotes/{head.Upstream}");
        }

        return current;
    }

    private static Dictionary<string, List<GitRefLabelModel>> Labels(GitHeadModel head, GitRefsModel refs)
    {
        var labels = new Dictionary<string, List<GitRefLabelModel>>(StringComparer.Ordinal);
        void Add(string sha, GitRefLabelModel label)
        {
            if (!labels.TryGetValue(sha, out var list))
            {
                list = [];
                labels[sha] = list;
            }

            list.Add(label);
        }

        if (head.Detached && head.Sha is not null)
        {
            Add(head.Sha, new GitRefLabelModel("HEAD", GitRefKind.Head, true));
        }

        foreach (var branch in refs.Branches.OrderByDescending(branch => branch.Current))
        {
            Add(branch.Sha, new GitRefLabelModel(branch.Name, GitRefKind.Branch, branch.Current));
        }

        foreach (var branch in refs.RemoteBranches)
        {
            Add(branch.Sha, new GitRefLabelModel(branch.Name, GitRefKind.Remote, false));
        }

        foreach (var tag in refs.Tags)
        {
            Add(tag.Sha, new GitRefLabelModel(tag.Name, GitRefKind.Tag, false));
        }

        return labels;
    }
}
