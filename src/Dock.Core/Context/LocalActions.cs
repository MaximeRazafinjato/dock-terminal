using System.Diagnostics;

namespace Dock.Core.Context;

public static class LocalActions
{
    public const string ExplorerExecutable = "explorer.exe";

    public static void OpenInExplorer(string path)
    {
        RequireDirectory(path);
        Process.Start(new ProcessStartInfo(ExplorerExecutable) { ArgumentList = { path }, UseShellExecute = false });
    }

    public static void OpenInEditor(string path, string editorCommand)
    {
        RequireDirectory(path);
        if (string.IsNullOrWhiteSpace(editorCommand))
        {
            throw new InvalidOperationException("Aucun éditeur configuré.");
        }

        try
        {
            Process.Start(new ProcessStartInfo(editorCommand) { ArgumentList = { path }, UseShellExecute = true, WindowStyle = ProcessWindowStyle.Hidden });
        }
        catch (Exception exception) when (exception is System.ComponentModel.Win32Exception or FileNotFoundException)
        {
            throw new InvalidOperationException($"L’éditeur « {editorCommand} » n’a pas pu être lancé : {exception.Message}");
        }
    }

    private static void RequireDirectory(string path)
    {
        if (!Directory.Exists(path))
        {
            throw new InvalidOperationException($"Le dossier n’existe plus : {path}");
        }
    }
}
