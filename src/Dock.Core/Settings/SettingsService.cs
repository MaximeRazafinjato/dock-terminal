using Dock.Core.Context;
using Dock.Core.Projects;
using Dock.Core.Session;
using Dock.Core.Shell;

namespace Dock.Core.Settings;

public sealed class SettingsService
{
    private readonly ShellPathsRepository _shells;
    private readonly EditorSettingsRepository _editor;
    private readonly PersistenceSettingsRepository _persistence;
    private readonly ProjectsSettingsRepository _projects;

    public SettingsService(string directory)
    {
        _shells = new ShellPathsRepository(directory);
        _editor = new EditorSettingsRepository(directory);
        _persistence = new PersistenceSettingsRepository(directory);
        _projects = new ProjectsSettingsRepository(directory);
    }

    public SettingsModel Load() => new()
    {
        Shells = _shells.Load().Executables.ToDictionary(pair => pair.Key, pair => pair.Value),
        Editor = _editor.Load().Command,
        Persistence = _persistence.Load(),
        ProjectsRoot = _projects.Load().Root
    };

    public ValidationResultModel Validate(SettingsModel settings)
    {
        var knownShells = ShellCatalog.Profiles().Select(profile => profile.Id).ToHashSet();
        var unknown = settings.Shells.Keys.FirstOrDefault(id => !knownShells.Contains(id));
        if (unknown is not null)
        {
            return ValidationResultModel.Fail($"Shell inconnu : {unknown}");
        }

        if (string.IsNullOrWhiteSpace(settings.Editor))
        {
            return ValidationResultModel.Fail("La commande de l’éditeur est vide.");
        }

        if (string.IsNullOrWhiteSpace(settings.ProjectsRoot))
        {
            return ValidationResultModel.Fail("Le dossier des projets est vide.");
        }

        if (!Path.IsPathRooted(settings.ProjectsRoot))
        {
            return ValidationResultModel.Fail($"Le dossier des projets doit être un chemin absolu : {settings.ProjectsRoot}");
        }

        return ValidationResultModel.Ok();
    }

    public ValidationResultModel Save(SettingsModel settings)
    {
        var result = Validate(settings);
        if (!result.IsValid)
        {
            return result;
        }

        settings.Shells = settings.Shells.Where(pair => !string.IsNullOrWhiteSpace(pair.Value)).ToDictionary(pair => pair.Key, pair => pair.Value.Trim());
        settings.Editor = settings.Editor.Trim();
        settings.Persistence = settings.Persistence.Clamped();
        settings.ProjectsRoot = settings.ProjectsRoot.Trim();
        _shells.Save(settings.Shells);
        _editor.Save(new EditorSettingsModel(settings.Editor));
        _persistence.Save(settings.Persistence);
        _projects.Save(new ProjectsSettingsModel(settings.ProjectsRoot));
        return result;
    }

    public SettingsSnapshotModel Snapshot(SettingsModel settings)
    {
        var paths = ShellPaths(settings);
        var defaults = ShellCatalog.Profiles(ShellPathsModel.Empty).ToDictionary(profile => profile.Id, profile => profile.Executable);
        var shells = ShellCatalog.Profiles(paths)
            .Select(profile => new ShellSettingModel(profile.Id, profile.Name, defaults[profile.Id], paths.ExecutableFor(profile.Id) ?? string.Empty, profile.Available))
            .ToList();
        var warnings = shells.Where(shell => !shell.Available).Select(shell => $"Le shell « {shell.Name} » est introuvable : {(shell.Configured.Length > 0 ? shell.Configured : shell.DefaultExecutable)}").ToList();
        if (Path.IsPathRooted(settings.Editor) && !File.Exists(settings.Editor))
        {
            warnings.Add($"La commande de l’éditeur est introuvable : {settings.Editor}");
        }

        if (!Directory.Exists(settings.ProjectsRoot))
        {
            warnings.Add($"Le dossier des projets est introuvable : {settings.ProjectsRoot}");
        }

        var files = new Dictionary<string, string>
        {
            ["shells"] = _shells.FilePath,
            ["editor"] = _editor.FilePath,
            ["persistence"] = _persistence.FilePath,
            ["projects"] = _projects.FilePath
        };
        return new SettingsSnapshotModel(settings, shells, files, warnings);
    }

    public static ShellPathsModel ShellPaths(SettingsModel settings) =>
        new(settings.Shells.Where(pair => !string.IsNullOrWhiteSpace(pair.Value)).ToDictionary(pair => pair.Key, pair => pair.Value, StringComparer.OrdinalIgnoreCase));
}
