namespace Dock.Host.Bridge;

public sealed class BackgroundQueue
{
    private readonly object _sync = new();
    private readonly Action<Exception> _onError;
    private Task _tail = Task.CompletedTask;

    public BackgroundQueue(Action<Exception> onError) => _onError = onError;

    public void Enqueue(Action work)
    {
        lock (_sync)
        {
            _tail = _tail.ContinueWith(_ => Run(work), CancellationToken.None, TaskContinuationOptions.None, TaskScheduler.Default);
        }
    }

    public bool Drain(TimeSpan timeout)
    {
        Task tail;
        lock (_sync)
        {
            tail = _tail;
        }

        return tail.Wait(timeout);
    }

    private void Run(Action work)
    {
        try
        {
            work();
        }
        catch (Exception exception)
        {
            _onError(exception);
        }
    }
}
