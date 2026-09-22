using Dock.Core.Session;
using Dock.Core.Settings;
using Xunit;

namespace Dock.Core.Tests.Settings;

public sealed class SettingsServiceTests : IDisposable
{
    private readonly string _directory = Path.Combine(Path.GetTempPath(), "dock-tests-" + Guid.NewGuid().ToString("N"));

    [Fact]
    public void Load_WhenNoFiles_ThenReturnsDefaultsAndWritesTemplates()
    {
        var service = new SettingsService(_directory);

        var settings = service.Load();

        Assert.Equal("code.cmd", settings.Editor);
        Assert.Equal(PersistenceSettingsModel.Default, settings.Persistence);
        Assert.Equal(@"C:\Files\Projects", settings.ProjectsRoot);
        Assert.Equal(4, Directory.GetFiles(_directory, "*.json").Length);
    }

    [Fact]
    public void Save_ThenLoad_RoundTripsEveryFile()
    {
        var service = new SettingsService(_directory);
        var settings = new SettingsModel
        {
            Shells = new Dictionary<string, string> { ["cmd"] = @"D:\outils\cmd.exe", ["pwsh"] = "  " },
            Editor = " notepad.exe ",
            Persistence = new PersistenceSettingsModel(60, 5000, 128),
            ProjectsRoot = _directory
        };

        var result = service.Save(settings);
        var loaded = service.Load();

        Assert.True(result.IsValid);
        Assert.Equal(new Dictionary<string, string> { ["cmd"] = @"D:\outils\cmd.exe" }, loaded.Shells);
        Assert.Equal("notepad.exe", loaded.Editor);
        Assert.Equal(new PersistenceSettingsModel(60, 5000, 128), loaded.Persistence);
        Assert.Equal(_directory, loaded.ProjectsRoot);
    }

    [Fact]
    public void Save_WhenShellUnknown_ThenRefusesWithoutWriting()
    {
        var service = new SettingsService(_directory);
        var settings = new SettingsModel { Shells = new Dictionary<string, string> { ["zsh"] = @"C:\zsh.exe" } };

        var result = service.Save(settings);

        Assert.False(result.IsValid);
        Assert.Equal("Shell inconnu : zsh", result.Error);
        Assert.Empty(Directory.GetFiles(_directory, "*.json"));
    }

    [Fact]
    public void Save_WhenProjectsRootRelative_ThenRefuses()
    {
        var service = new SettingsService(_directory);

        var result = service.Save(new SettingsModel { ProjectsRoot = "Projets" });

        Assert.False(result.IsValid);
        Assert.Contains("chemin absolu", result.Error);
    }

    [Fact]
    public void Snapshot_WhenPathsMissing_ThenWarnsWithoutFailing()
    {
        var service = new SettingsService(_directory);
        var settings = new SettingsModel
        {
            Shells = new Dictionary<string, string> { ["gitbash"] = @"C:\introuvable\bash.exe" },
            ProjectsRoot = @"C:\introuvable\projets"
        };

        var snapshot = service.Snapshot(settings);

        Assert.False(snapshot.Shells.Single(shell => shell.Id == "gitbash").Available);
        Assert.Contains(snapshot.Warnings, warning => warning.Contains(@"C:\introuvable\bash.exe"));
        Assert.Contains(snapshot.Warnings, warning => warning.Contains(@"C:\introuvable\projets"));
        Assert.Equal(4, snapshot.Files.Count);
    }

    public void Dispose()
    {
        if (Directory.Exists(_directory))
        {
            Directory.Delete(_directory, true);
        }
    }
}
