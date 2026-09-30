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

    private readonly object _sync = new();
    private readonly List<AgentHistoryEntryModel> _entries = new();

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
        lock (_sync)
        {
            return _entries
                .OrderByDescending(entry => entry.LastSeenAtUtc)
                .Select(entry =>
                {
                    var live = liveSessionIds.Contains(entry.SessionId);
                    var reason = Unavailability(entry, live, transcriptExists);
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
    }

    public (AgentHistoryEntryModel? Entry, string? Error) Resumable(string sessionId, IReadOnlySet<string> liveSessionIds, Func<AgentHistoryEntryModel, bool> transcriptExists)
    {
        lock (_sync)
        {
            var entry = _entries.FirstOrDefault(candidate => candidate.SessionId == sessionId);
            if (entry is null)
            {
                return (null, UnknownSession);
            }

            var reason = Unavailability(entry, liveSessionIds.Contains(sessionId), transcriptExists);
            return reason is null ? (entry, null) : (null, reason);
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
        string json;
        lock (_sync)
        {
            json = JsonSerializer.Serialize(new AgentHistoryDocumentModel { Sessions = _entries.ToList() }, SessionRepository.JsonOptions);
        }

        AtomicFile.Write(FilePath, json);
    }

    private static string? Unavailability(AgentHistoryEntryModel entry, bool live, Func<AgentHistoryEntryModel, bool> transcriptExists) =>
        live ? AlreadyRunning
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
                if (!Guid.TryParse(entry.SessionId, out _) || string.IsNullOrWhiteSpace(entry.Directory))
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
