using Dock.Core.Session;
using Xunit;

namespace Dock.Core.Tests.Session;

public sealed class SessionRepositoryTests : IDisposable
{
    private readonly string _directory = Path.Combine(Path.GetTempPath(), "dock-tests-" + Guid.NewGuid().ToString("N"));

    [Fact]
    public void Load_WhenNoFile_ThenReturnsNull()
    {
        var repository = new SessionRepository(_directory);

        Assert.Null(repository.Load());
    }

    [Fact]
    public void Save_ThenLoad_RoundTripsTheSession()
    {
        var repository = new SessionRepository(_directory);
        var session = SessionFactory.Initial();
        session.Workspaces[0].Name = "Projet A";

        var saved = repository.Save(session);
        var loaded = repository.Load();

        Assert.True(saved.IsValid);
        Assert.NotNull(loaded);
        Assert.Equal("Projet A", loaded!.Workspaces[0].Name);
        Assert.Equal(session.Workspaces[0].Tabs[0].Tree.Pane!.Id, loaded.Workspaces[0].Tabs[0].Tree.Pane!.Id);
    }

    [Fact]
    public void Save_WhenInvalid_ThenRefusesAndKeepsPreviousFile()
    {
        var repository = new SessionRepository(_directory);
        repository.Save(SessionFactory.Initial());
        var invalid = SessionFactory.Initial();
        invalid.Active = "inconnu";

        var result = repository.Save(invalid);

        Assert.False(result.IsValid);
        Assert.NotNull(repository.Load());
    }

    [Fact]
    public void Load_WhenFileCorrupted_ThenReturnsNull()
    {
        var repository = new SessionRepository(_directory);
        File.WriteAllText(repository.FilePath, "{ pas du json");

        Assert.Null(repository.Load());
    }

    public void Dispose()
    {
        if (Directory.Exists(_directory))
        {
            Directory.Delete(_directory, true);
        }
    }
}
