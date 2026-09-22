using System.Collections.Concurrent;
using System.Text;
using System.Text.Json;
using Dock.Core.Context;
using Dock.Core.Projects;
using Dock.Core.Session;
using Dock.Core.Shell;
using Dock.Core.Terminal;
using Microsoft.UI.Dispatching;
using Microsoft.Web.WebView2.Core;

namespace Dock.Host.Bridge;

public sealed class HostBridge : IDisposable
{
    private const int MaxCharsPerMessage = 512 * 1024;
    private static readonly JsonSerializerOptions JsonOptions = SessionRepository.JsonOptions;

    private readonly DispatcherQueue _dispatcher;
    private readonly Action _closeWindow;
    private readonly SessionRepository _sessions;
    private readonly PersistenceSettingsModel _persistence;
    private readonly PaneTextRepository _texts;
    private readonly ShellPathsModel _shellPaths;
    private readonly EditorSettingsModel _editor;
    private readonly TerminalManager _terminals;
    private readonly ConcurrentDictionary<string, PaneOutputBuffer> _buffers = new();
    private CoreWebView2? _core;
    private int _flushScheduled;
    private bool _closing;
    private DispatcherQueueTimer? _closeTimer;

    public HostBridge(DispatcherQueue dispatcher, string dataDirectory, Action closeWindow)
    {
        _dispatcher = dispatcher;
        _closeWindow = closeWindow;
        _sessions = new SessionRepository(dataDirectory);
        _persistence = new PersistenceSettingsRepository(dataDirectory).Load();
        _texts = new PaneTextRepository(dataDirectory, _persistence.MaxTextChars);
        _shellPaths = new ShellPathsRepository(dataDirectory).Load();
        _editor = new EditorSettingsRepository(dataDirectory).Load();
        _terminals = new TerminalManager(_shellPaths);
        _terminals.OutputReceived += HandleOutput;
        _terminals.CurrentDirectoryChanged += HandleCurrentDirectoryChanged;
        _terminals.Exited += (paneId, code) => Post(new { type = "terminal.exit", pane = paneId, code });
    }

    public void Attach(CoreWebView2 core)
    {
        _core = core;
        core.WebMessageReceived += (_, args) => Handle(args.WebMessageAsJson);
    }

    private void Handle(string json)
    {
        BridgeCommandModel? command;
        try
        {
            command = JsonSerializer.Deserialize<BridgeCommandModel>(json, JsonOptions);
        }
        catch (JsonException)
        {
            Post(new { type = "error", message = "Message du pont illisible." });
            return;
        }

        if (command is null)
        {
            return;
        }

        try
        {
            Dispatch(command);
        }
        catch (Exception exception)
        {
            Post(new { type = "error", pane = command.Pane, message = exception.Message });
        }
    }

    public bool RequestClose()
    {
        if (_core is null || _closing)
        {
            return false;
        }

        _closing = true;
        PostNow(new { type = "app.closing" });
        _closeTimer = _dispatcher.CreateTimer();
        _closeTimer.Interval = TimeSpan.FromSeconds(3);
        _closeTimer.IsRepeating = false;
        _closeTimer.Tick += (_, _) => _closeWindow();
        _closeTimer.Start();
        return true;
    }

    private void Dispatch(BridgeCommandModel command)
    {
        switch (command.Type)
        {
            case "app.ready":
                SendHello();
                break;
            case "session.save":
                SaveSession(command);
                break;
            case "text.save":
                SaveText(command);
                break;
            case "terminal.create":
                CreateTerminal(command);
                break;
            case "terminal.input":
                _terminals.Require(RequirePane(command)).Write(Encoding.UTF8.GetBytes(command.Data ?? string.Empty));
                break;
            case "terminal.resize":
                _terminals.Require(RequirePane(command)).Resize(command.Cols, command.Rows);
                break;
            case "terminal.ack":
                if (_buffers.TryGetValue(RequirePane(command), out var buffer))
                {
                    buffer.Acknowledge(command.Chars);
                }

                break;
            case "terminal.close":
                CloseTerminal(RequirePane(command));
                break;
            case "projects.list":
                var projects = ProjectCatalog.List(ProjectCatalog.DefaultRoot);
                Post(new { type = "projects.listed", root = projects.Root, projects = projects.Projects, error = projects.Error });
                break;
            case "context.query":
                var path = RequirePath(command);
                Post(new { type = "context.result", pane = RequirePane(command), path, git = GitContext.Resolve(path) });
                break;
            case "context.open":
                OpenFolder(RequirePath(command), command.Target);
                break;
            case "window.close":
                _closeWindow();
                break;
            default:
                Post(new { type = "error", pane = command.Pane, message = $"Commande inconnue : {command.Type}" });
                break;
        }
    }

    private void SendHello()
    {
        var loaded = _sessions.Load();
        var text = _texts.Load();
        var recovery = string.Join(" ", new[] { loaded.Error, text.Error }.Where(error => error is not null));
        Post(new
        {
            type = "app.hello",
            session = loaded.Session ?? SessionFactory.Initial(),
            shells = ShellCatalog.Profiles(_shellPaths),
            home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
            text = text.Text,
            persistence = new { textIntervalSeconds = _persistence.TextIntervalSeconds, linesPerPane = _persistence.LinesPerPane },
            recovery = recovery.Length > 0 ? recovery : null
        });
    }

    private void SaveSession(BridgeCommandModel command)
    {
        var session = command.Session?.Deserialize<SessionModel>(JsonOptions) ?? throw new InvalidOperationException("Session manquante.");
        Persist(_sessions.FilePath, () =>
        {
            var result = _sessions.Save(session);
            return result.IsValid ? null : $"Session refusée : {result.Error}";
        });
    }

    private void SaveText(BridgeCommandModel command)
    {
        var text = command.Text?.Deserialize<Dictionary<string, string>>(JsonOptions) ?? throw new InvalidOperationException("Texte des terminaux manquant.");
        Persist(_texts.FilePath, () =>
        {
            _texts.Save(text);
            return null;
        });
    }

    private void Persist(string filePath, Func<string?> write)
    {
        string? failure;
        try
        {
            failure = write();
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            failure = $"Impossible d’écrire {filePath} : {exception.Message}";
        }

        if (failure is null)
        {
            Post(new { type = "session.saved" });
        }
        else
        {
            Post(new { type = "session.saveFailed", message = failure });
        }
    }

    private void CreateTerminal(BridgeCommandModel command)
    {
        var paneId = RequirePane(command);
        CloseTerminal(paneId);
        _buffers[paneId] = new PaneOutputBuffer(paneId);
        var cwd = command.Cwd ?? string.Empty;
        var session = _terminals.Start(paneId, command.Shell ?? ShellCatalog.DefaultShellId, cwd, command.Cols, command.Rows);
        Post(new { type = "terminal.created", pane = paneId, pid = session.ProcessId });
        if (cwd.Length > 0 && !Directory.Exists(cwd))
        {
            Post(new { type = "terminal.pathMissing", pane = paneId, path = cwd, fallback = PathFallback.NearestExisting(cwd) });
        }
    }

    private void HandleCurrentDirectoryChanged(string paneId, string path)
    {
        Post(new { type = "terminal.cwd", pane = paneId, path });
        foreach (var missing in _terminals.MissingDirectories())
        {
            Post(new { type = "terminal.pathMissing", pane = missing.PaneId, path = missing.Path, fallback = missing.Fallback });
        }
    }

    private void CloseTerminal(string paneId)
    {
        if (_buffers.TryRemove(paneId, out var buffer))
        {
            buffer.Release();
        }

        _terminals.Stop(paneId);
    }

    private void HandleOutput(string paneId, ReadOnlyMemory<byte> data)
    {
        if (!_buffers.TryGetValue(paneId, out var buffer))
        {
            return;
        }

        buffer.Append(data.Span);
        if (Interlocked.CompareExchange(ref _flushScheduled, 1, 0) == 0)
        {
            _dispatcher.TryEnqueue(DispatcherQueuePriority.High, Flush);
        }
    }

    private void Flush()
    {
        Interlocked.Exchange(ref _flushScheduled, 0);
        foreach (var buffer in _buffers.Values)
        {
            var text = buffer.Take();
            if (text is null)
            {
                continue;
            }

            for (var offset = 0; offset < text.Length; offset += MaxCharsPerMessage)
            {
                var length = Math.Min(MaxCharsPerMessage, text.Length - offset);
                PostNow(new { type = "terminal.output", pane = buffer.PaneId, data = text.Substring(offset, length) });
            }
        }
    }

    private void OpenFolder(string path, string? target)
    {
        switch (target)
        {
            case "editor":
                LocalActions.OpenInEditor(path, _editor.Command);
                break;
            case "explorer":
                LocalActions.OpenInExplorer(path);
                break;
            default:
                throw new InvalidOperationException($"Cible d’ouverture inconnue : {target}");
        }
    }

    private static string RequirePath(BridgeCommandModel command) =>
        command.Path ?? throw new InvalidOperationException("Chemin manquant.");

    private static string RequirePane(BridgeCommandModel command) =>
        command.Pane ?? throw new InvalidOperationException("Identifiant de pane manquant.");

    private void Post(object message) => _dispatcher.TryEnqueue(() => PostNow(message));

    private void PostNow(object message) => _core?.PostWebMessageAsJson(JsonSerializer.Serialize(message, JsonOptions));

    public void Dispose()
    {
        foreach (var buffer in _buffers.Values)
        {
            buffer.Release();
        }

        _terminals.Dispose();
    }
}
