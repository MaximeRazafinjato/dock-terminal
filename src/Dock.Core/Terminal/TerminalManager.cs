using System.Collections.Concurrent;
using Dock.Core.Shell;

namespace Dock.Core.Terminal;

public sealed class TerminalManager : IDisposable
{
    private readonly ConcurrentDictionary<string, TerminalSession> _sessions = new();

    public event Action<string, ReadOnlyMemory<byte>>? OutputReceived;
    public event Action<string, string>? CurrentDirectoryChanged;
    public event Action<string, uint>? Exited;

    public TerminalSession Start(string paneId, string shellId, string workingDirectory, int columns, int rows)
    {
        Stop(paneId);
        var profile = ShellCatalog.Resolve(shellId);
        var directory = Directory.Exists(workingDirectory) ? workingDirectory : Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        var session = new TerminalSession(new TerminalSessionOptions
        {
            PaneId = paneId,
            CommandLine = ShellCatalog.CommandLine(profile),
            WorkingDirectory = directory,
            Columns = Math.Max(columns, 20),
            Rows = Math.Max(rows, 5)
        });
        session.OutputReceived += data => OutputReceived?.Invoke(paneId, data);
        session.CurrentDirectoryChanged += path => CurrentDirectoryChanged?.Invoke(paneId, path);
        session.Exited += code =>
        {
            if (_sessions.TryGetValue(paneId, out var current) && ReferenceEquals(current, session))
            {
                Exited?.Invoke(paneId, code);
            }
        };
        _sessions[paneId] = session;
        return session;
    }

    public TerminalSession Require(string paneId) =>
        _sessions.TryGetValue(paneId, out var session) ? session : throw new InvalidOperationException($"Aucun terminal pour le pane {paneId}.");

    public bool TryGet(string paneId, out TerminalSession session) => _sessions.TryGetValue(paneId, out session!);

    public void Stop(string paneId)
    {
        if (_sessions.TryRemove(paneId, out var session))
        {
            session.Dispose();
        }
    }

    public void Dispose()
    {
        foreach (var paneId in _sessions.Keys.ToList())
        {
            Stop(paneId);
        }
    }
}
