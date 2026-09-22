import { LEADER_HINTS } from '../keyboard/shortcuts'

export function LeaderHints() {
  return (
    <div role="status" aria-live="polite" className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-xs">
      <span className="shrink-0 rounded bg-dock-focus px-2 py-0.5 font-semibold text-dock-terminal">Leader…</span>
      <ul className="flex min-w-0 items-center gap-3 truncate text-dock-muted">
        {LEADER_HINTS.map((hint) => (
          <li key={hint.keys} className="shrink-0">
            <kbd className="rounded border border-dock-line bg-dock-paper px-1 font-mono text-[11px] text-dock-ink">{hint.keys}</kbd> {hint.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
