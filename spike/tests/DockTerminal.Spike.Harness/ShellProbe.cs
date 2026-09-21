using System.Text;
using System.Text.RegularExpressions;
using DockTerminal.Spike.Core.Native;
using DockTerminal.Spike.Core.Shell;
using DockTerminal.Spike.Core.Terminal;

namespace DockTerminal.Spike.Harness;

public sealed partial class ShellProbe : IDisposable
{
    private static readonly string Escape = ((char)27).ToString();
    private static readonly byte[][] TerminalQueries =
    {
        Encoding.ASCII.GetBytes(Escape + "[c"),
        Encoding.ASCII.GetBytes(Escape + "[0c"),
        Encoding.ASCII.GetBytes(Escape + "[6n"),
        Encoding.ASCII.GetBytes(Escape + "[?6n")
    };
    private static readonly byte[] DeviceAttributesReply = Encoding.ASCII.GetBytes(Escape + "[?61;6;7;22;23;24;28;32;42c");
    private static readonly byte[] CursorPositionReply = Encoding.ASCII.GetBytes(Escape + "[1;1R");

    private readonly StringBuilder _transcript = new();
    private readonly Decoder _decoder = Encoding.UTF8.GetDecoder();
    private readonly object _sync = new();
    private readonly SemaphoreSlim _outputSignal = new(0);
    private int _answeredQueries;

    public TerminalSession Session { get; }
    public string? CurrentDirectory { get; private set; }
    public int AnsweredQueries => _answeredQueries;

    public ShellProbe(PseudoConsoleProvider provider, string paneId, string workingDirectory)
    {
        Session = new TerminalSession(new TerminalSessionOptions
        {
            PaneId = paneId,
            Provider = provider,
            CommandLine = PowerShellIntegration.BuildCommandLine(),
            WorkingDirectory = workingDirectory
        });
        Session.OutputReceived += HandleOutput;
        Session.CurrentDirectoryChanged += HandleDirectory;
    }

    public void SendLine(string command) => Session.Write(Encoding.UTF8.GetBytes(command + "\r"));

    public async Task<Match> WaitForAsync(Regex pattern, TimeSpan timeout)
    {
        var deadline = DateTime.UtcNow + timeout;
        while (true)
        {
            string snapshot;
            lock (_sync)
            {
                snapshot = _transcript.ToString();
            }

            var match = pattern.Match(snapshot);
            if (match.Success)
            {
                return match;
            }

            var remaining = deadline - DateTime.UtcNow;
            if (remaining <= TimeSpan.Zero || !await _outputSignal.WaitAsync(remaining))
            {
                throw new TimeoutException($"Motif attendu introuvable dans la sortie du shell : {pattern}");
            }
        }
    }

    public async Task<string> WaitForDirectoryAsync(Func<string, bool> predicate, TimeSpan timeout)
    {
        var deadline = DateTime.UtcNow + timeout;
        while (true)
        {
            var current = CurrentDirectory;
            if (current is not null && predicate(current))
            {
                return current;
            }

            var remaining = deadline - DateTime.UtcNow;
            if (remaining <= TimeSpan.Zero || !await _outputSignal.WaitAsync(remaining))
            {
                throw new TimeoutException($"Dossier courant attendu non reçu (dernier connu : {current ?? "aucun"}).");
            }
        }
    }

    public void ClearTranscript()
    {
        lock (_sync)
        {
            _transcript.Clear();
        }
    }

    public string TranscriptTail(int maxLength)
    {
        lock (_sync)
        {
            var text = _transcript.ToString();
            var tail = text.Length <= maxLength ? text : text[^maxLength..];
            return tail.Replace("\r", string.Empty).Replace("\n", " ⏎ ");
        }
    }

    public static string StripAnsi(string text) => AnsiPattern().Replace(text, string.Empty);

    private void AnswerTerminalQueries(ReadOnlySpan<byte> data)
    {
        foreach (var query in TerminalQueries)
        {
            var offset = 0;
            while (offset < data.Length)
            {
                var index = data[offset..].IndexOf(query);
                if (index < 0)
                {
                    break;
                }

                var reply = query[^1] == (byte)'n' ? CursorPositionReply : DeviceAttributesReply;
                Session.Write(reply);
                Interlocked.Increment(ref _answeredQueries);
                offset += index + query.Length;
            }
        }
    }

    private void HandleOutput(ReadOnlyMemory<byte> data)
    {
        AnswerTerminalQueries(data.Span);
        var chars = new char[_decoder.GetCharCount(data.Span, false)];
        var written = _decoder.GetChars(data.Span, chars, false);
        lock (_sync)
        {
            _transcript.Append(StripAnsi(new string(chars, 0, written)));
        }

        _outputSignal.Release();
    }

    private void HandleDirectory(string directory)
    {
        CurrentDirectory = directory;
        _outputSignal.Release();
    }

    [GeneratedRegex(@"\x1B\[[0-?]*[ -/]*[@-~]|\x1B\][^\x07\x1B]*(\x07|\x1B\\)|\x1B[@-Z\\-_]")]
    private static partial Regex AnsiPattern();

    public void Dispose()
    {
        Session.Dispose();
        _outputSignal.Dispose();
    }
}
