using System.Collections.Concurrent;
using System.Text;
using System.Text.Json;
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
    private readonly ShellPathsModel _shellPaths;
    private readonly TerminalManager _terminals;
    private readonly ConcurrentDictionary<string, PaneOutputBuffer> _buffers = new();
    private CoreWebView2? _core;
    private int _flushScheduled;

    public HostBridge(DispatcherQueue dispatcher, string dataDirectory, Action closeWindow)
    {
        _dispatcher = dispatcher;
        _closeWindow = closeWindow;
        _sessions = new SessionRepository(dataDirectory);
        _shellPaths = new ShellPathsRepository(dataDirectory).Load();
        _terminals = new TerminalManager(_shellPaths);
        _terminals.OutputReceived += HandleOutput;
        _terminals.CurrentDirectoryChanged += (paneId, path) => Post(new { type = "terminal.cwd", pane = paneId, path });
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

    private void Dispatch(BridgeCommandModel command)
    {
        switch (command.Type)
        {
            case "app.ready":
                Post(new { type = "app.hello", session = _sessions.Load() ?? SessionFactory.Initial(), shells = ShellCatalog.Profiles(_shellPaths), home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile) });
                break;
            case "session.save":
                SaveSession(command);
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
            case "window.close":
                _closeWindow();
                break;
            default:
                Post(new { type = "error", pane = command.Pane, message = $"Commande inconnue : {command.Type}" });
                break;
        }
    }

    private void SaveSession(BridgeCommandModel command)
    {
        var session = command.Session?.Deserialize<SessionModel>(JsonOptions);
        var result = _sessions.Save(session ?? throw new InvalidOperationException("Session manquante."));
        if (!result.IsValid)
        {
            throw new InvalidOperationException($"Session refusée : {result.Error}");
        }
    }

    private void CreateTerminal(BridgeCommandModel command)
    {
        var paneId = RequirePane(command);
        CloseTerminal(paneId);
        _buffers[paneId] = new PaneOutputBuffer(paneId);
        var session = _terminals.Start(paneId, command.Shell ?? ShellCatalog.DefaultShellId, command.Cwd ?? string.Empty, command.Cols, command.Rows);
        Post(new { type = "terminal.created", pane = paneId, pid = session.ProcessId });
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
