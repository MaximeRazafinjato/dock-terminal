using Dock.Core.Session;
using Xunit;

namespace Dock.Core.Tests.Session;

public sealed class SessionValidatorTests
{
    [Fact]
    public void Validate_WhenInitialSession_ThenIsValid()
    {
        var session = SessionFactory.Initial();

        var result = SessionValidator.Validate(session);

        Assert.True(result.IsValid);
    }

    [Fact]
    public void Validate_WhenNull_ThenFails()
    {
        var result = SessionValidator.Validate(null);

        Assert.False(result.IsValid);
        Assert.Equal("Format de session incorrect.", result.Error);
    }

    [Fact]
    public void Validate_WhenActiveWorkspaceUnknown_ThenFails()
    {
        var session = SessionFactory.Initial();
        session.Active = "inconnu";

        var result = SessionValidator.Validate(session);

        Assert.Equal("Workspace actif invalide.", result.Error);
    }

    [Fact]
    public void Validate_WhenActivePaneUnknown_ThenFails()
    {
        var session = SessionFactory.Initial();
        session.Workspaces[0].Tabs[0].Active = "inconnu";

        var result = SessionValidator.Validate(session);

        Assert.Equal("Pane actif invalide.", result.Error);
    }

    [Fact]
    public void Validate_WhenSplitRatioOutOfRange_ThenFails()
    {
        var session = SessionFactory.Initial();
        var tab = session.Workspaces[0].Tabs[0];
        var leaf = tab.Tree;
        tab.Tree = new SplitNodeModel { Axis = "x", Ratio = 0.95, A = leaf, B = new SplitNodeModel { Pane = SessionFactory.Pane("C:\\", "powershell") } };

        var result = SessionValidator.Validate(session);

        Assert.Equal("Split invalide.", result.Error);
    }

    [Fact]
    public void Validate_WhenTreeTooDeep_ThenFails()
    {
        var session = SessionFactory.Initial();
        var tab = session.Workspaces[0].Tabs[0];
        var node = tab.Tree;
        for (var depth = 0; depth <= SessionLimits.MaxDepth; depth++)
        {
            node = new SplitNodeModel { Axis = "y", Ratio = 0.5, A = node, B = new SplitNodeModel { Pane = SessionFactory.Pane("C:\\", "powershell") } };
        }

        tab.Tree = node;

        var result = SessionValidator.Validate(session);

        Assert.Equal("Disposition invalide.", result.Error);
    }

    [Fact]
    public void Validate_WhenSidebarOutOfRange_ThenClampsIt()
    {
        var session = SessionFactory.Initial();
        session.Sidebar = 10;

        SessionValidator.Validate(session);

        Assert.Equal(SessionLimits.MinSidebarWidth, session.Sidebar);
    }
}
