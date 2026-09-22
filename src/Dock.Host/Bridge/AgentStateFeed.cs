using System.Text.Json;
using Dock.Core.Agents;
using Dock.Core.Session;
using Dock.Core.Terminal;
using Microsoft.UI.Dispatching;

namespace Dock.Host.Bridge;

public sealed class AgentStateFeed : IDisposable
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(2);

    private readonly DispatcherQueue _dispatcher;
    private readonly TerminalManager _terminals;
    private readonly Action<object> _post;
    private readonly AgentStateRepository _states;
    private readonly AgentMonitor _monitor;
    private readonly FileSystemWatcher _watcher;
    private DispatcherQueueTimer? _timer;
    private string _lastPosted = string.Empty;

    public AgentStateFeed(DispatcherQueue dispatcher, string dataDirectory, TerminalManager terminals, Action<object> post)
    {
        _dispatcher = dispatcher;
        _terminals = terminals;
        _post = post;
        _states = new AgentStateRepository(dataDirectory);
        _states.Clear();
        Directory.CreateDirectory(_states.Directory);
        _monitor = new AgentMonitor(_states);
        Hooks = new ClaudeHooksInstaller(ScriptPath);
        _watcher = new FileSystemWatcher(_states.Directory, "*.json") { NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.FileName };
        _watcher.Changed += HandleFileChanged;
        _watcher.Created += HandleFileChanged;
        _watcher.Deleted += HandleFileChanged;
        _watcher.EnableRaisingEvents = true;
    }

    public string ScriptPath { get; } = Path.Combine(AppContext.BaseDirectory, "hooks", "dock-agent-state.ps1");

    public string StateDirectory => _states.Directory;

    public ClaudeHooksInstaller Hooks { get; }

    public object Describe()
    {
        var status = Hooks.Status();
        return new { script = ScriptPath, stateDirectory = StateDirectory, settingsFile = status.SettingsFile, hooksInstalled = status.Installed };
    }

    public void Start()
    {
        _timer = _dispatcher.CreateTimer();
        _timer.Interval = PollInterval;
        _timer.IsRepeating = true;
        _timer.Tick += (_, _) => Refresh();
        _timer.Start();
    }

    public void Forget(string paneId) => _states.Delete(paneId);

    private void HandleFileChanged(object sender, FileSystemEventArgs args) => _dispatcher.TryEnqueue(Refresh);

    private void Refresh()
    {
        if (_timer is null)
        {
            return;
        }

        var agents = _monitor.Resolve(_terminals.Probes());
        var json = JsonSerializer.Serialize(agents, SessionRepository.JsonOptions);
        if (json == _lastPosted)
        {
            return;
        }

        _lastPosted = json;
        _post(new { type = "agent.states", panes = agents });
    }

    public void Dispose()
    {
        _timer?.Stop();
        _timer = null;
        _watcher.Dispose();
    }
}
