import { agentLabel, STATE_LABELS, stateDuration, waitedFor, type PaneLocation } from '../agents/agentSummary'
import type { AgentCard } from '../bridge/agentMessages'
import { AgentCardDetails } from './AgentCardDetails'
import { AgentStateIcon } from './AgentStateIcon'

interface AgentCardViewProps {
  card: AgentCard
  location: PaneLocation | undefined
  branch: string | null
  now: number
  active: boolean
  expanded: boolean
  onToggle: (paneId: string) => void
  onJoin: (paneId: string) => void
  onOpenFile: (paneId: string, path: string) => void
}

const JOIN_BUTTON = 'mt-[3px] flex size-[22px] shrink-0 cursor-pointer items-center justify-center rounded text-[13px] text-tily-muted hover:bg-tily-panel hover:text-tily-ink'

export function AgentCardView({ card, location, branch, now, active, expanded, onToggle, onJoin, onOpenFile }: AgentCardViewProps) {
  const place = location ? `${location.workspaceName} › ${location.tabName}` : agentLabel(card)
  const placeTip = location ? [location.path, branch].filter(Boolean).join(' · ') : undefined
  const elapsed = now - card.since
  const handleToggle = () => onToggle(card.paneId)
  const handleJoin = () => onJoin(card.paneId)
  const handleOpenFile = (path: string) => onOpenFile(card.paneId, path)

  return (
    <li className={`rounded-md ${active ? 'bg-tily-green-soft' : 'hover:bg-tily-panel'}`}>
      <div className="flex items-start gap-[2px] pr-[3px]">
        <button
          type="button"
          data-agent-card=""
          data-pane={card.paneId}
          aria-expanded={expanded}
          aria-current={active ? 'true' : undefined}
          className="flex min-w-0 flex-1 cursor-pointer flex-col gap-[1px] rounded-md px-[6px] py-[5px] text-left"
          onClick={handleToggle}
        >
          <span className="flex w-full items-center gap-[6px] text-[11.5px]">
            <AgentStateIcon state={card.state} />
            <span className="min-w-0 flex-1 truncate text-tily-ink-soft" data-tip={placeTip}>
              {place}
            </span>
            <span className="shrink-0 text-[11px] text-tily-muted" data-tip={`${STATE_LABELS[card.state]} ${waitedFor(elapsed)}`}>
              {stateDuration(elapsed)}
            </span>
          </span>
          <span className="w-full truncate pl-[18px] text-[12.5px] font-semibold text-tily-ink">{card.title ?? agentLabel(card)}</span>
          {card.summary && <span className="line-clamp-2 w-full pl-[18px] text-[12px] [overflow-wrap:anywhere] text-tily-muted">{card.summary}</span>}
        </button>
        <button type="button" className={JOIN_BUTTON} aria-label="Rejoindre le terminal" data-tip="Rejoindre le terminal (Entrée)" onClick={handleJoin}>
          ↗
        </button>
      </div>
      {expanded && <AgentCardDetails card={card} onOpenFile={handleOpenFile} />}
    </li>
  )
}
