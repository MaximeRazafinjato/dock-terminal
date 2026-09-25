import { useCallback, useRef, useState } from 'react'
import { alertStateCounts, stateBreakdown, workspaceStateCounts, type AgentMap } from '../agents/agentSummary'
import type { Workspace } from '../model/session'
import { ActionMenu, type ActionMenuItem } from './ActionMenu'
import { WorkspaceStatus } from './WorkspaceStatus'

interface WorkspaceOverflowProps {
  workspaces: Workspace[]
  agents: AgentMap
  onSelect: (workspaceId: string) => void
}

const countLabel = (count: number): string => (count === 1 ? '1 autre workspace' : `${count} autres workspaces`)

export function WorkspaceOverflow({ workspaces, agents, onSelect }: WorkspaceOverflowProps) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const openAtPressRef = useRef(false)
  const count = workspaces.length
  const alerts = alertStateCounts(workspaces, agents)
  const breakdown = stateBreakdown(alerts)
  const label = breakdown ? `${countLabel(count)} · ${breakdown}` : countLabel(count)

  if (open && count === 0) {
    setOpen(false)
  }

  const handlePointerDown = () => {
    openAtPressRef.current = open
  }
  const handleClick = () => {
    if (!openAtPressRef.current) {
      setOpen(true)
    }
    openAtPressRef.current = false
  }
  const handleClose = useCallback(() => {
    setOpen(false)
    buttonRef.current?.focus()
  }, [])
  const items: ActionMenuItem[] = workspaces.map((workspace) => ({
    id: workspace.id,
    label: workspace.name,
    detail: <WorkspaceStatus counts={workspaceStateCounts(workspace, agents)} />,
    run: () => {
      setOpen(false)
      onSelect(workspace.id)
    },
  }))

  return (
    <span data-strip-overflow="" className={count > 0 ? 'relative shrink-0' : 'invisible absolute'}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        data-tip={label}
        className="flex h-[28px] cursor-pointer items-center gap-[6px] rounded-md px-[8px] text-[13px] text-dock-muted tabular-nums hover:bg-dock-green-hover hover:text-dock-ink"
        onPointerDown={handlePointerDown}
        onClick={handleClick}
      >
        +{count}
        <WorkspaceStatus counts={alerts} />
      </button>
      {open && <ActionMenu label="Autres workspaces" items={items} align="right" onClose={handleClose} />}
    </span>
  )
}
