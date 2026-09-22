namespace Dock.Core.Projects;

public sealed record ProjectModel(string Name, string Path);

public sealed record ProjectListModel(string Root, IReadOnlyList<ProjectModel> Projects, string? Error);

public static class ProjectCatalog
{
    public const string DefaultRoot = @"C:\Files\Projects";
    public const string ExcludedFolder = "worktrees";

    public static ProjectListModel List(string root)
    {
        if (!Directory.Exists(root))
        {
            return new ProjectListModel(root, [], $"Le dossier des projets est introuvable : {root}");
        }

        try
        {
            var projects = new DirectoryInfo(root)
                .EnumerateDirectories()
                .Where(directory => !string.Equals(directory.Name, ExcludedFolder, StringComparison.OrdinalIgnoreCase))
                .Where(directory => !directory.Attributes.HasFlag(FileAttributes.Hidden))
                .OrderBy(directory => directory.Name, StringComparer.CurrentCultureIgnoreCase)
                .Select(directory => new ProjectModel(directory.Name, directory.FullName))
                .ToList();
            return new ProjectListModel(root, projects, null);
        }
        catch (Exception exception) when (exception is UnauthorizedAccessException or IOException)
        {
            return new ProjectListModel(root, [], $"Le dossier des projets est inaccessible : {exception.Message}");
        }
    }
}
