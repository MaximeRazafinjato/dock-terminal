using System.ComponentModel;
using System.Text.Json;
using Tily.Core.Agents;
using Tily.Core.Session;
using Tily.Core.Terminal;

namespace Tily.Host.Bridge;

public sealed class AgentStateFeed : IDisposable
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(2);
    private static readonly TimeSpan ChangeDelay = TimeSpan.FromMilliseconds(150);

    private readonly TerminalManager _terminals;
    private readonly Action<object> _post;
    private readonly AgentStateRepository _states;
    private readonly AgentMonitor _monitor;
    private readonly AgentRequestRepository _requests;
    private readonly AgentResponder _responder;
    private readonly AgentBoard _board = new();
    private readonly FileSystemWatcher _watcher;
    private readonly object _refreshLock = new();
    private Timer? _timer;
    private int _changePending;
    private int _resendPending;
    private bool _disposed;
    private string _lastPosted = string.Empty;
    private string _lastBoard = string.Empty;
    private IReadOnlyDictionary<string, int> _paneOrder = new Dictionary<string, int>();

    public AgentStateFeed(string dataDirectory, TerminalManager terminals, Action<object> post)
    {
        _terminals = terminals;
        _post = post;
        _states = new AgentStateRepository(dataDirectory);
        _states.Clear();
        Directory.CreateDirectory(_states.Directory);
        _requests = new AgentRequestRepository(_states.Directory);
        _responder = new AgentResponder(_requests);
        _monitor = new AgentMonitor(_states, new ClaudeSessionRegistry(ClaudeSessionRegistry.DefaultDirectory()), _requests);
        Hooks = new ClaudeHooksInstaller(ScriptPath);
        _watcher = new FileSystemWatcher(_states.Directory, "*.json") { NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.FileName };
        _watcher.Changed += HandleFileChanged;
        _watcher.Created += HandleFileChanged;
        _watcher.Deleted += HandleFileChanged;
        _watcher.EnableRaisingEvents = true;
    }

    public string ScriptPath { get; } = Path.Combine(AppContext.BaseDirectory, "hooks", "tily-agent-state.ps1");

    public string StateDirectory => _states.Directory;

    public ClaudeHooksInstaller Hooks { get; }

    public object Describe()
    {
        var status = Hooks.Status();
        return new { script = ScriptPath, stateDirectory = StateDirectory, settingsFile = status.SettingsFile, hooksInstalled = status.Installed, hooksOutdated = status.Outdated };
    }

    public void Start() => _timer = new Timer(_ => Refresh(), null, PollInterval, PollInterval);

    public void Forget(string paneId)
    {
        _states.Delete(paneId);
        _requests.Forget(paneId);
    }

    public string? Respond(string paneId, AgentAnswerModel answer) => _responder.Respond(paneId, ResolveNow(paneId), answer);

    public string? MessageError(string paneId, string? message) => AgentResponder.MessageError(ResolveNow(paneId), message);

    private PaneAgentModel? ResolveNow(string paneId) =>
        _terminals.Probe(paneId) is { } probe ? _monitor.Resolve([probe]).FirstOrDefault() : null;

    public void UseLayout(SessionModel session)
    {
        Volatile.Write(ref _paneOrder, AgentBoard.PaneOrder(session));
        ScheduleSoon();
    }

    public void Resend()
    {
        Interlocked.Exchange(ref _resendPending, 1);
        ScheduleSoon();
    }

    private void HandleFileChanged(object sender, FileSystemEventArgs args) => ScheduleSoon();

    private void ScheduleSoon()
    {
        if (Interlocked.Exchange(ref _changePending, 1) == 0)
        {
            _timer?.Change(ChangeDelay, PollInterval);
        }
    }

    private void Refresh()
    {
        if (!Monitor.TryEnter(_refreshLock))
        {
            ScheduleSoon();
            return;
        }

        try
        {
            Interlocked.Exchange(ref _changePending, 0);
            if (_disposed)
            {
                return;
            }

            if (Interlocked.Exchange(ref _resendPending, 0) == 1)
            {
                _lastPosted = string.Empty;
                _lastBoard = string.Empty;
            }

            var agents = _monitor.Resolve(_terminals.Probes());
            var json = JsonSerializer.Serialize(agents, SessionRepository.JsonOptions);
            if (json != _lastPosted)
            {
                _lastPosted = json;
                _post(new { type = "agent.states", panes = agents });
            }

            var cards = _board.Build(agents, Volatile.Read(ref _paneOrder));
            var board = JsonSerializer.Serialize(cards, SessionRepository.JsonOptions);
            if (board != _lastBoard)
            {
                _lastBoard = board;
                _post(new { type = "agent.board", cards });
            }
        }
        catch (Exception exception) when (exception is Win32Exception or IOException or UnauthorizedAccessException or InvalidOperationException or ArgumentException)
        {
        }
        finally
        {
            Monitor.Exit(_refreshLock);
        }
    }

    public void Dispose()
    {
        _watcher.Dispose();
        _timer?.Dispose();
        lock (_refreshLock)
        {
            _disposed = true;
        }
    }
}
