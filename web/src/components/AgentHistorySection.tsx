import { useState } from 'react'
import { resumeSession } from '../agents/agentHistory'
import type { AgentHistoryItem } from '../bridge/agentMessages'
import type { PaneLocation } from '../agents/agentSummary'
import { AgentHistoryRow } from './AgentHistoryRow'
import { Icon } from './Icon'
import { IconName } from './iconName'

interface AgentHistorySectionProps {
  toResume: AgentHistoryItem[]
  past: AgentHistoryItem[]
  locations: Record<string, PaneLocation>
  now: number
}

const GROUP_TITLE = 'flex items-center gap-[6px] px-[6px] py-[4px] text-[11px] font-semibold tracking-[0.06em] text-tily-muted uppercase'

export function AgentHistorySection({ toResume, past, locations, now }: AgentHistorySectionProps) {
  const [open, setOpen] = useState(true)
  const handleToggle = () => setOpen((current) => !current)
  const renderResume = (item: AgentHistoryItem) => {
    const pane = item.paneId ? locations[item.paneId] : undefined
    const handleResume = () => resumeSession(item.sessionId, item.paneId)
    return (
      <li key={item.sessionId} className="flex items-center gap-[6px] rounded-md px-[6px] py-[4px] hover:bg-tily-panel">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[12px] text-tily-ink">{item.title ?? 'Session sans titre'}</span>
          <span className="truncate text-[11px] text-tily-muted">{pane ? `${pane.workspaceName} › ${pane.tabName}` : item.location}</span>
        </span>
        <button
          type="button"
          className="shrink-0 cursor-pointer rounded border border-tily-green px-[7px] py-[1px] text-[11px] text-tily-green-deep hover:bg-tily-green-soft aria-disabled:cursor-default aria-disabled:opacity-40"
          aria-disabled={!item.resumable}
          data-tip={item.reason ?? 'Relance claude --resume dans ce terminal'}
          onClick={item.resumable ? handleResume : undefined}
        >
          Reprendre ici
        </button>
      </li>
    )
  }

  return (
    <>
      {toResume.length > 0 && (
        <section aria-label={`À reprendre : ${toResume.length}`} className="mt-[4px]">
          <h3 className={GROUP_TITLE}>
            À reprendre
            <span className="font-normal tracking-normal">{toResume.length}</span>
          </h3>
          <ul className="flex flex-col gap-[2px]">{toResume.map(renderResume)}</ul>
        </section>
      )}
      {past.length > 0 && (
        <section aria-label="Historique" className="mt-[8px] border-t border-tily-line pt-[4px]">
          <button type="button" aria-expanded={open} className={`${GROUP_TITLE} w-full cursor-pointer text-left hover:text-tily-ink`} onClick={handleToggle}>
            <span className={open ? 'rotate-90' : ''}>
              <Icon name={IconName.Chevron} />
            </span>
            Historique
            <span className="font-normal tracking-normal">{past.length}</span>
          </button>
          {open && (
            <ul className="flex flex-col gap-[1px]">
              {past.map((item) => (
                <AgentHistoryRow key={item.sessionId} item={item} now={now} />
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  )
}
