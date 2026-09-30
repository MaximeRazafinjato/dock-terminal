import { useState } from 'react'
import { endedLabel, resumeSession } from '../agents/agentHistory'
import type { AgentHistoryItem } from '../bridge/agentMessages'
import { AgentStateIcon } from './AgentStateIcon'
import { LazyAgentMarkdown } from './LazyAgentMarkdown'

interface AgentHistoryRowProps {
  item: AgentHistoryItem
  now: number
}

const RESUME_BUTTON =
  'shrink-0 cursor-pointer rounded border border-tily-line px-[7px] py-[1px] text-[11px] text-tily-ink-soft hover:bg-tily-panel hover:text-tily-ink aria-disabled:cursor-default aria-disabled:opacity-40 aria-disabled:hover:bg-transparent'

export function AgentHistoryRow({ item, now }: AgentHistoryRowProps) {
  const [open, setOpen] = useState(false)
  const handleToggle = () => setOpen((current) => !current)
  const handleResume = () => resumeSession(item.sessionId)

  return (
    <li className="rounded-md hover:bg-tily-panel">
      <div className="flex items-center gap-[4px] pr-[4px]">
        <button type="button" aria-expanded={open} className="flex min-w-0 flex-1 cursor-pointer items-center gap-[6px] px-[6px] py-[4px] text-left" onClick={handleToggle}>
          <AgentStateIcon state={item.state} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[12px] text-tily-ink">{item.title ?? 'Session sans titre'}</span>
            <span className="truncate text-[11px] text-tily-muted" data-tip={item.directory}>
              {[item.location, endedLabel(item.endedAt, now)].filter(Boolean).join(' · ')}
            </span>
          </span>
        </button>
        <button type="button" className={RESUME_BUTTON} aria-disabled={!item.resumable} data-tip={item.reason ?? `Nouvel onglet dans ${item.directory} : claude --resume`} onClick={item.resumable ? handleResume : undefined}>
          Reprendre
        </button>
      </div>
      {open && (
        <div className="flex flex-col gap-[6px] pr-[8px] pb-[8px] pl-[24px] text-[12px]">
          <p className="font-mono text-[11px] [overflow-wrap:anywhere] text-tily-muted">{item.directory}</p>
          {item.lastMessage && (
            <div className="max-h-[240px] overflow-auto rounded bg-tily-panel px-[8px] py-[6px] text-tily-ink">
              <LazyAgentMarkdown content={item.lastMessage} />
            </div>
          )}
          {item.files.length > 0 && (
            <ul className="flex flex-col">
              {item.files.map((file) => (
                <li key={file.path} className="flex items-center gap-[6px] font-mono text-[11px]" data-tip={file.path}>
                  <span className="min-w-0 flex-1 truncate text-tily-ink-soft">{file.name}</span>
                  <span className="text-tily-diff-added-ink">+{file.added}</span>
                  <span className="text-tily-diff-removed-ink">−{file.removed}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  )
}
