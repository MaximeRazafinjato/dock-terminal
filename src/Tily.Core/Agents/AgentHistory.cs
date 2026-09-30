using System.Text.Json;
using Tily.Core.Session;

namespace Tily.Core.Agents;

public sealed class AgentHistory
{
    public const int MaxSessions = 50;
    public const int MaxLastMessageLength = 10_000;
    public const string MissingDirectory = "Le dossier de la session n’existe plus.";
    public const string MissingTranscript = "Claude Code a effacé le transcript de cette session (30 jours par défaut).";
    public const string AlreadyRunning = "Cette session tourne déjà dans un terminal.";
    public const string UnknownSession = "Session inconnue de l’historique.";
    public const string ResumeInProgress = "Cette session est déjà en cours de reprise.";

    public static readonly TimeSpan ResumeWindow = TimeSpan.FromMinutes(1);

    private readonly object _sync = new();
    private readonly object _saveLock = new();
    private readonly List<AgentHistoryEntryModel> _entries = new();
    private readonly Dictionary<string, DateTime> _resuming = new();

    public AgentHistory(string dataDirectory)
    {
        FilePath = Path.Combine(dataDirectory, "agent-history.json");
        LoadError = Load();
    }

    public string FilePath { get; }

    public string? LoadError { get; }

    public bool Observe(IReadOnlyList<PaneAgentModel> agents, IReadOnlyList<AgentCardModel> cards, IReadOnlyDictionary<string, string> locations, DateTime nowUtc)
    {
        lock (_sync)
        {
            var changed = false;
            var seen = new HashSet<string>();
            foreach (var agent in agents.Where(agent => agent.SessionId is not null && !string.IsNullOrWhiteSpace(agent.SessionDirectory)))
            {
                seen.Add(agent.SessionId!);
                var entry = _entries.FirstOrDefault(candidate => candidate.SessionId == agent.SessionId);
                if (entry is null)
                {
                    entry = new AgentHistoryEntryModel { SessionId = agent.SessionId!, StartedAtUtc = nowUtc };
                    _entries.Add(entry);
                    changed = true;
                }

                changed |= Assign(entry, agent, cards.FirstOrDefault(card => card.PaneId == agent.PaneId), locations);
                changed |= entry.EndedAtUtc is not null || entry.PendingResume;
                entry.EndedAtUtc = null;
                entry.PendingResume = false;
                entry.LastSeenAtUtc = nowUtc;
            }

            foreach (var entry in _entries.Where(entry => entry.EndedAtUtc is null && !seen.Contains(entry.SessionId)))
            {
                entry.EndedAtUtc = entry.LastSeenAtUtc;
                changed = true;
            }

            foreach (var entry in _entries.Where(entry => entry.PendingResume && agents.Any(agent => agent.PaneId == entry.PaneId && agent.SessionId is not null)))
            {
                entry.PendingResume = false;
                changed = true;
            }

            foreach (var sessionId in _resuming.Where(pair => seen.Contains(pair.Key) || nowUtc - pair.Value >= ResumeWindow).Select(pair => pair.Key).ToList())
            {
                _resuming.Remove(sessionId);
                changed = true;
            }

            if (_entries.Count > MaxSessions)
            {
                _entries.Sort((first, second) => second.LastSeenAtUtc.CompareTo(first.LastSeenAtUtc));
                _entries.RemoveRange(MaxSessions, _entries.Count - MaxSessions);
                changed = true;
            }

            return changed;
        }
    }

    public IReadOnlyList<AgentHistoryItemModel> Items(IReadOnlySet<string> liveSessionIds, Func<AgentHistoryEntryModel, bool> transcriptExists)
    {
        List<AgentHistoryEntryModel> entries;
        HashSet<string> resuming;
        lock (_sync)
        {
            entries = _entries.OrderByDescending(entry => entry.LastSeenAtUtc).Select(Copy).ToList();
            resuming = _resuming.Keys.ToHashSet();
        }

        return entries
            .Select(entry =>
            {
                var live = liveSessionIds.Contains(entry.SessionId);
                var reason = Unavailability(entry, live, resuming.Contains(entry.SessionId), transcriptExists);
                return new AgentHistoryItemModel(
                    entry.SessionId,
                    entry.Directory,
                    entry.PaneId,
                    entry.Location,
                    entry.Title,
                    UnixMilliseconds(entry.StartedAtUtc),
                    entry.EndedAtUtc is { } ended ? UnixMilliseconds(ended) : null,
                    entry.LastMessage,
                    entry.Files,
                    entry.State,
                    live,
                    entry.PendingResume && !live,
                    reason is null,
                    reason);
            })
            .ToList();
    }

    public (AgentHistoryEntryModel? Entry, string? Error) Resumable(string sessionId, IReadOnlySet<string> liveSessionIds, Func<AgentHistoryEntryModel, bool> transcriptExists)
    {
        AgentHistoryEntryModel? entry;
        bool resuming;
        lock (_sync)
        {
            entry = _entries.FirstOrDefault(candidate => candidate.SessionId == sessionId) is { } found ? Copy(found) : null;
            resuming = _resuming.ContainsKey(sessionId);
        }

        if (entry is null)
        {
            return (null, UnknownSession);
        }

        var reason = Unavailability(entry, liveSessionIds.Contains(sessionId), resuming, transcriptExists);
        return reason is null ? (entry, null) : (null, reason);
    }

    public void MarkResuming(string sessionId, DateTime nowUtc)
    {
        lock (_sync)
        {
            _resuming[sessionId] = nowUtc;
        }
    }

    public bool DismissResume(string paneId)
    {
        lock (_sync)
        {
            var pending = _entries.Where(entry => entry.PendingResume && entry.PaneId == paneId).ToList();
            pending.ForEach(entry => entry.PendingResume = false);
            return pending.Count > 0;
        }
    }

    public void Save()
    {
        lock (_saveLock)
        {
            string json;
            lock (_sync)
            {
                json = JsonSerializer.Serialize(new AgentHistoryDocumentModel { Sessions = _entries.ToList() }, SessionRepository.JsonOptions);
            }

            AtomicFile.Write(FilePath, json);
        }
    }

    private static AgentHistoryEntryModel Copy(AgentHistoryEntryModel entry) =>
        new()
        {
            SessionId = entry.SessionId,
            Directory = entry.Directory,
            PaneId = entry.PaneId,
            Location = entry.Location,
            Title = entry.Title,
            StartedAtUtc = entry.StartedAtUtc,
            LastSeenAtUtc = entry.LastSeenAtUtc,
            EndedAtUtc = entry.EndedAtUtc,
            LastMessage = entry.LastMessage,
            Files = entry.Files,
            State = entry.State,
            PendingResume = entry.PendingResume
        };

    private static string? Unavailability(AgentHistoryEntryModel entry, bool live, bool resuming, Func<AgentHistoryEntryModel, bool> transcriptExists) =>
        live ? AlreadyRunning
        : resuming ? ResumeInProgress
        : !System.IO.Directory.Exists(entry.Directory) ? MissingDirectory
        : !transcriptExists(entry) ? MissingTranscript
        : null;

    private static bool Assign(AgentHistoryEntryModel entry, PaneAgentModel agent, AgentCardModel? card, IReadOnlyDictionary<string, string> locations)
    {
        var location = locations.TryGetValue(agent.PaneId, out var label) ? label : entry.Location;
        var title = card?.Title ?? entry.Title;
        var message = card?.LastMessage is { } text ? text.Length <= MaxLastMessageLength ? text : text[..MaxLastMessageLength] + "…" : entry.LastMessage;
        var files = card?.Files.ToList() ?? entry.Files;
        var changed = entry.Directory != agent.SessionDirectory || entry.PaneId != agent.PaneId || entry.Location != location || entry.Title != title
            || entry.LastMessage != message || entry.State != agent.State || !entry.Files.SequenceEqual(files);
        entry.Directory = agent.SessionDirectory!;
        entry.PaneId = agent.PaneId;
        entry.Location = location;
        entry.Title = title;
        entry.LastMessage = message;
        entry.State = agent.State;
        entry.Files = files;
        return changed;
    }

    private string? Load()
    {
        if (!File.Exists(FilePath))
        {
            return null;
        }

        try
        {
            var document = JsonSerializer.Deserialize<AgentHistoryDocumentModel>(File.ReadAllText(FilePath), SessionRepository.JsonOptions);
            foreach (var entry in document?.Sessions ?? [])
            {
                if (entry is null || !Guid.TryParse(entry.SessionId, out _) || string.IsNullOrWhiteSpace(entry.Directory))
                {
                    continue;
                }

                if (entry.EndedAtUtc is null)
                {
                    entry.EndedAtUtc = entry.LastSeenAtUtc;
                    entry.PendingResume = entry.PaneId is not null;
                }

                entry.Files ??= new();
                _entries.Add(entry);
            }

            return null;
        }
        catch (Exception exception) when (exception is JsonException or IOException or UnauthorizedAccessException or NotSupportedException)
        {
            return $"Historique des agents illisible, mis de côté dans {Quarantine()} : il repart de zéro.";
        }
    }

    private string Quarantine()
    {
        try
        {
            return CorruptedFiles.Quarantine(FilePath);
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            return FilePath;
        }
    }

    private static long UnixMilliseconds(DateTime utc) => new DateTimeOffset(DateTime.SpecifyKind(utc, DateTimeKind.Utc)).ToUnixTimeMilliseconds();
}
