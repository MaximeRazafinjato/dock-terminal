import type { MouseEvent } from 'react'
import { AgentState } from '../bridge/messages'
import { STATE_LABELS, stateBreakdown, workspaceSummary, type StateCounts } from '../agents/agentSummary'
import { AgentStateIcon } from './AgentStateIcon'

interface WorkspaceStatusProps {
  counts: StateCounts
  onJoin: (state: AgentState) => void
}

const PILL_CLASSES: Partial<Record<AgentState, string>> = {
  [AgentState.Waiting]: 'bg-dock-status-waiting/15 text-dock-status-waiting',
  [AgentState.Error]: 'bg-dock-status-error/15 text-dock-status-error',
}

export function WorkspaceStatus({ counts, onJoin }: WorkspaceStatusProps) {
  const { alerts, activity } = workspaceSummary(counts)
  if (alerts.length === 0 && !activity) {
    return null
  }
  const breakdown = stateBreakdown(counts)
  return (
    <span className="flex shrink-0 items-center gap-1.5" data-tip={breakdown}>
      {alerts.map(({ state, count }) => {
        const label = `Rejoindre le terminal ${STATE_LABELS[state].toLowerCase()}`
        const handleJoin = (event: MouseEvent) => {
          event.stopPropagation()
          onJoin(state)
        }
        return (
          <button
            key={state}
            type="button"
            className={`flex h-4 cursor-pointer items-center gap-[3px] rounded-full pr-1.5 pl-[3px] text-[11px] leading-none font-semibold tabular-nums hover:brightness-125 ${PILL_CLASSES[state]}`}
            aria-label={`${label} (${count})`}
            data-tip={label}
            onClick={handleJoin}
          >
            <span className="pointer-events-none flex">
              <AgentStateIcon state={state} size={10} />
            </span>
            {count}
          </button>
        )
      })}
      {activity && <AgentStateIcon state={activity} tip={breakdown} />}
    </span>
  )
}
