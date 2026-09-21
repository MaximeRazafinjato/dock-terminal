using System.Text;
using DockTerminal.Spike.Core.Terminal;

namespace DockTerminal.Spike.Host.Bridge;

public sealed class PaneHost : IDisposable
{
    private const long UnackedCharsLimit = 4L * 1024 * 1024;

    private readonly Decoder _decoder = Encoding.UTF8.GetDecoder();
    private readonly object _sync = new();
    private readonly ManualResetEventSlim _flowGate = new(true);
    private readonly Action _requestFlush;
    private StringBuilder _pending = new();
    private long _unackedChars;
    private long _forwardedChars;
    private long _messages;

    public string PaneId { get; }
    public TerminalSession Session { get; }
    public bool SinkOnly { get; set; }
    public long ForwardedChars => Interlocked.Read(ref _forwardedChars);
    public long Messages => Interlocked.Read(ref _messages);
    public long UnackedChars => Interlocked.Read(ref _unackedChars);

    public PaneHost(string paneId, TerminalSession session, Action requestFlush)
    {
        PaneId = paneId;
        Session = session;
        _requestFlush = requestFlush;
        Session.OutputReceived += HandleOutput;
    }

    public string? TakePending()
    {
        StringBuilder taken;
        lock (_sync)
        {
            if (_pending.Length == 0)
            {
                return null;
            }

            taken = _pending;
            _pending = new StringBuilder();
        }

        Interlocked.Increment(ref _messages);
        Interlocked.Add(ref _forwardedChars, taken.Length);
        return taken.ToString();
    }

    public void Acknowledge(int chars)
    {
        if (Interlocked.Add(ref _unackedChars, -chars) < UnackedCharsLimit)
        {
            _flowGate.Set();
        }
    }

    public void ResetCounters()
    {
        Interlocked.Exchange(ref _forwardedChars, 0);
        Interlocked.Exchange(ref _messages, 0);
    }

    private void HandleOutput(ReadOnlyMemory<byte> data)
    {
        if (SinkOnly)
        {
            return;
        }

        var chars = new char[_decoder.GetCharCount(data.Span, false)];
        var written = _decoder.GetChars(data.Span, chars, false);
        lock (_sync)
        {
            _pending.Append(chars, 0, written);
        }

        _requestFlush();
        if (Interlocked.Add(ref _unackedChars, written) >= UnackedCharsLimit)
        {
            _flowGate.Reset();
            _flowGate.Wait(TimeSpan.FromSeconds(10));
        }
    }

    public void Dispose()
    {
        Session.OutputReceived -= HandleOutput;
        _flowGate.Set();
        Session.Dispose();
        _flowGate.Dispose();
    }
}
