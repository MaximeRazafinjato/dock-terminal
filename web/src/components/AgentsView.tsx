import { useMemo, useState, type KeyboardEvent } from 'react'
import { openAgentLaunch } from '../agents/agentLaunch'
import { consecutiveGroups, paneLocations, STATE_LABELS } from '../agents/agentSummary'
import { AGENT_CARD_SELECTOR, openAgentFileChanges } from '../agents/agentsView'
import { focusActivePane } from '../explorer/fileExplorerActions'
import { activeTab, activeWorkspace, type Session } from '../model/session'
import { useAgentStore } from '../store/agentStore'
import { useHostStore } from '../store/hostStore'
import { joinPane } from '../terminal/terminalActions'
import { AgentCardView } from './AgentCardView'
import { useClock } from './useClock'

interface AgentsViewProps {
  session: Session
}

const CLOCK_INTERVAL_MS = 30_000
const EXPAND_KEYS: Record<string, boolean> = { ArrowRight: true, ArrowLeft: false }

export function AgentsView({ session }: AgentsViewProps) {
  const cards = useAgentStore((state) => state.cards)
  const contexts = useHostStore((state) => state.contexts)
  const now = useClock(cards.length > 0, CLOCK_INTERVAL_MS)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const locations = useMemo(() => paneLocations(session), [session])
  const groups = useMemo(() => consecutiveGroups(cards), [cards])
  const workspace = activeWorkspace(session)
  const activePaneId = workspace ? activeTab(workspace).active : undefined

  const isExpanded = (paneId: string): boolean => expanded[paneId] ?? paneId === activePaneId
  const handleToggle = (paneId: string) => setExpanded((current) => ({ ...current, [paneId]: !(current[paneId] ?? paneId === activePaneId) }))
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const target = event.target
    if (event.altKey || event.ctrlKey || event.metaKey || !(target instanceof HTMLElement) || !target.matches(AGENT_CARD_SELECTOR)) {
      return
    }
    const rows = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(AGENT_CARD_SELECTOR))
    const index = rows.indexOf(target)
    const destinations: Record<string, number> = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: rows.length - 1 }
    const paneId = target.dataset.pane ?? ''
    if (event.key in destinations) {
      event.preventDefault()
      rows[destinations[event.key]]?.focus()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      focusActivePane()
    } else if (event.key === 'Enter') {
      event.preventDefault()
      joinPane(paneId)
    } else if (event.key in EXPAND_KEYS) {
      event.preventDefault()
      setExpanded((current) => ({ ...current, [paneId]: EXPAND_KEYS[event.key] }))
    }
  }

  if (cards.length === 0) {
    return (
      <div data-agents-view="" tabIndex={-1} className="flex min-h-0 flex-1 flex-col gap-[6px] px-[14px] py-[10px] text-[12px] text-tily-muted outline-none">
        <p className="text-tily-ink-soft">Aucun agent pour l’instant.</p>
        <p>Lancez Claude Code (<code className="font-mono">claude</code>) dans un terminal : il apparaîtra ici avec son état, son dernier message et les fichiers qu’il modifie.</p>
        <button type="button" className="self-start cursor-pointer rounded border border-tily-green px-3 py-1 text-[12px] text-tily-green-deep hover:bg-tily-green-soft" onClick={openAgentLaunch}>
          Lancer un agent…
        </button>
      </div>
    )
  }

  return (
    <div data-agents-view="" tabIndex={-1} className="min-h-0 flex-1 overflow-auto px-[8px] pb-[8px] outline-none" onKeyDown={handleKeyDown}>
      {groups.map((group) => (
        <section key={group.state} aria-label={`${STATE_LABELS[group.state]} : ${group.cards.length}`} className="mt-[4px]">
          <h3 className="flex items-center gap-[6px] px-[6px] py-[4px] text-[11px] font-semibold tracking-[0.06em] text-tily-muted uppercase">
            {STATE_LABELS[group.state]}
            <span className="font-normal tracking-normal">{group.cards.length}</span>
          </h3>
          <ul className="flex flex-col gap-[2px]">
            {group.cards.map((card) => (
              <AgentCardView
                key={card.paneId}
                card={card}
                location={locations[card.paneId]}
                branch={contexts[card.paneId]?.branch ?? null}
                now={now}
                active={card.paneId === activePaneId}
                expanded={isExpanded(card.paneId)}
                onToggle={handleToggle}
                onJoin={joinPane}
                onOpenFile={openAgentFileChanges}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
