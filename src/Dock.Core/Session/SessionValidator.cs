namespace Dock.Core.Session;

public sealed record ValidationResultModel(bool IsValid, string? Error)
{
    public static ValidationResultModel Ok() => new(true, null);
    public static ValidationResultModel Fail(string error) => new(false, error);
}

public static class SessionValidator
{
    public static ValidationResultModel Validate(SessionModel? session)
    {
        if (session is null || session.Version != SessionLimits.CurrentVersion || session.Workspaces.Count == 0)
        {
            return ValidationResultModel.Fail("Format de session incorrect.");
        }

        var nodeCount = 0;
        foreach (var workspace in session.Workspaces)
        {
            var workspaceResult = ValidateWorkspace(workspace, ref nodeCount);
            if (!workspaceResult.IsValid)
            {
                return workspaceResult;
            }
        }

        if (!session.Workspaces.Any(workspace => workspace.Id == session.Active))
        {
            return ValidationResultModel.Fail("Workspace actif invalide.");
        }

        session.Sidebar = Math.Clamp(session.Sidebar, SessionLimits.MinSidebarWidth, SessionLimits.MaxSidebarWidth);
        return ValidationResultModel.Ok();
    }

    private static ValidationResultModel ValidateWorkspace(WorkspaceModel workspace, ref int nodeCount)
    {
        if (string.IsNullOrEmpty(workspace.Id) || workspace.Name is null || workspace.Tabs.Count == 0)
        {
            return ValidationResultModel.Fail("Workspace invalide.");
        }

        foreach (var tab in workspace.Tabs)
        {
            if (string.IsNullOrEmpty(tab.Id) || tab.Name is null)
            {
                return ValidationResultModel.Fail("Onglet invalide.");
            }

            var treeResult = ValidateTree(tab.Tree, 0, ref nodeCount);
            if (!treeResult.IsValid)
            {
                return treeResult;
            }

            if (!SplitTree.Panes(tab.Tree).Any(pane => pane.Id == tab.Active))
            {
                return ValidationResultModel.Fail("Pane actif invalide.");
            }
        }

        return workspace.Tabs.Any(tab => tab.Id == workspace.Active)
            ? ValidationResultModel.Ok()
            : ValidationResultModel.Fail("Onglet actif invalide.");
    }

    private static ValidationResultModel ValidateTree(SplitNodeModel? node, int depth, ref int nodeCount)
    {
        if (node is null || ++nodeCount > SessionLimits.MaxNodes || depth > SessionLimits.MaxDepth)
        {
            return ValidationResultModel.Fail("Disposition invalide.");
        }

        if (node.IsLeaf)
        {
            var pane = node.Pane!;
            return string.IsNullOrEmpty(pane.Id) || pane.Path is null || string.IsNullOrEmpty(pane.Shell)
                ? ValidationResultModel.Fail("Pane invalide.")
                : ValidationResultModel.Ok();
        }

        if (node.Axis is not ("x" or "y") || node.Ratio is null || node.Ratio < SessionLimits.MinRatio || node.Ratio > SessionLimits.MaxRatio)
        {
            return ValidationResultModel.Fail("Split invalide.");
        }

        var left = ValidateTree(node.A, depth + 1, ref nodeCount);
        return left.IsValid ? ValidateTree(node.B, depth + 1, ref nodeCount) : left;
    }
}
