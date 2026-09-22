namespace Dock.Core.Session;

public static class AtomicFile
{
    public static void Write(string filePath, string content)
    {
        var temporaryPath = filePath + ".tmp";
        File.WriteAllText(temporaryPath, content);
        File.Move(temporaryPath, filePath, true);
    }
}
