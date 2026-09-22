using Dock.Core.Session;
using Xunit;

namespace Dock.Core.Tests.Session;

public sealed class PaneTextRepositoryTests : IDisposable
{
    private readonly string _directory = Path.Combine(Path.GetTempPath(), "dock-tests-" + Guid.NewGuid().ToString("N"));

    [Fact]
    public void Load_WhenNoFile_ThenReturnsEmptyWithoutError()
    {
        var repository = new PaneTextRepository(_directory, 1000);

        var loaded = repository.Load();

        Assert.Empty(loaded.Text);
        Assert.Null(loaded.Error);
    }

    [Fact]
    public void Save_ThenLoad_RoundTripsTextPerPane()
    {
        var repository = new PaneTextRepository(_directory, 1000);

        repository.Save(new Dictionary<string, string> { ["p1"] = "ligne 1\r\nligne 2", ["p2"] = "autre" });
        var loaded = repository.Load();

        Assert.Equal("ligne 1\r\nligne 2", loaded.Text["p1"]);
        Assert.Equal("autre", loaded.Text["p2"]);
    }

    [Fact]
    public void Save_WhenTotalExceedsLimit_ThenDropsPanesBeyondLimit()
    {
        var repository = new PaneTextRepository(_directory, 10);

        var kept = repository.Save(new Dictionary<string, string> { ["p1"] = "123456", ["p2"] = "123456" });

        Assert.Equal(new[] { "p1" }, kept.Keys);
    }

    [Fact]
    public void Load_WhenFileCorrupted_ThenQuarantinesAndReturnsEmpty()
    {
        var repository = new PaneTextRepository(_directory, 1000);
        File.WriteAllText(repository.FilePath, "{ pas du json");

        var loaded = repository.Load();

        Assert.Empty(loaded.Text);
        Assert.False(File.Exists(repository.FilePath));
        Assert.Contains("copie conservée", loaded.Error);
        Assert.Single(Directory.GetFiles(_directory, "text.corrompu-*.json"));
    }

    public void Dispose()
    {
        if (Directory.Exists(_directory))
        {
            Directory.Delete(_directory, true);
        }
    }
}
