namespace Tily.Core.Agents;

public sealed class TranscriptReader
{
    public const long MaxInitialBytes = 64L * 1024 * 1024;

    private const int ChunkSize = 64 * 1024;

    private readonly string? _baseDirectory;
    private TranscriptAccumulator _accumulator;
    private long _offset;

    public TranscriptReader(string path, string? baseDirectory)
    {
        FilePath = path;
        _baseDirectory = baseDirectory;
        _accumulator = new TranscriptAccumulator(baseDirectory);
    }

    public string FilePath { get; }

    public TranscriptSummaryModel Read()
    {
        try
        {
            ReadAppended();
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
        }

        return _accumulator.Summary();
    }

    private void ReadAppended()
    {
        if (!File.Exists(FilePath))
        {
            return;
        }

        using var stream = new FileStream(FilePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);
        var length = stream.Length;
        if (length < _offset)
        {
            _accumulator = new TranscriptAccumulator(_baseDirectory);
            _offset = 0;
        }

        if (length == _offset)
        {
            return;
        }

        var skipFirstLine = false;
        if (_offset == 0 && length > MaxInitialBytes)
        {
            _offset = length - MaxInitialBytes;
            skipFirstLine = true;
        }

        stream.Seek(_offset, SeekOrigin.Begin);
        var buffer = new byte[ChunkSize];
        using var line = new MemoryStream();
        var position = _offset;
        while (position < length)
        {
            var read = stream.Read(buffer, 0, (int)Math.Min(buffer.Length, length - position));
            if (read <= 0)
            {
                break;
            }

            var chunk = buffer.AsSpan(0, read);
            var consumed = 0;
            int newline;
            while ((newline = chunk[consumed..].IndexOf((byte)'\n')) >= 0)
            {
                line.Write(chunk.Slice(consumed, newline));
                if (skipFirstLine)
                {
                    skipFirstLine = false;
                }
                else
                {
                    _accumulator.Apply(line.GetBuffer().AsSpan(0, (int)line.Length));
                }

                line.SetLength(0);
                consumed += newline + 1;
                _offset = position + consumed;
            }

            line.Write(chunk[consumed..]);
            position += read;
        }
    }
}
