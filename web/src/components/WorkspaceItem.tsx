import { memo, type MouseEvent, type PointerEvent } from 'react'
import { STATE_PRIORITY, stateCountLabel, tabAgents, workspaceStateCounts, type AgentMap } from '../agents/agentSummary'
import { activePane, DEFAULT_SHELL, panesOf, type Workspace } from '../model/session'
import type { TabDropTarget } from '../store/uiStore'
import { AgentStateIcon } from './AgentStateIcon'
import { EditableName } from './EditableName'
import { InlineNameEditor } from './InlineNameEditor'
import { beginTabDrag, isDropTarget, type MoveTabHandler } from './tabDrag'

const SHELL_TAGS: Record<string, string> = { pwsh: 'PS 7', cmd: 'CMD', gitbash: 'Git Bash' }

const shellTagOf = (shell: string): string | null => (shell === DEFAULT_SHELL ? null : (SHELL_TAGS[shell] ?? shell))

const MIDDLE_BUTTON = 1
const CLOSE_BUTTON = 'shrink-0 cursor-pointer rounded px-1.5 text-[13px] leading-none opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-dock-green-hover hover:text-dock-error'

interface WorkspaceItemProps {
  workspace: Workspace
  selected: boolean
  renaming: boolean
  agents: AgentMap
  draggingTabId: string | null
  dropTarget: TabDropTarget | null
  onSelectWorkspace: (workspaceId: string) => void
  onStartRename: (workspaceId: string) => void
  onCommitRename: (name: string) => void
  onCancelRename: () => void
  onSelectTab: (workspaceId: string, tabId: string) => void
  onToggle: (workspaceId: string) => void
  onMoveTab: MoveTabHandler
  onCloseTab: (tabId: string) => void
  onCloseWorkspace: (workspaceId: string) => void
}

export const WorkspaceItem = memo(function WorkspaceItem({ workspace, selected, renaming, agents, draggingTabId, dropTarget, onSelectWorkspace, onStartRename, onCommitRename, onCancelRename, onSelectTab, onToggle, onMoveTab, onCloseTab, onCloseWorkspace }: WorkspaceItemProps) {
  const expanded = workspace.expanded ?? selected
  const tabsId = `workspace-tabs-${workspace.id}`
  const stateCounts = workspaceStateCounts(workspace, agents)
  const presentStates = STATE_PRIORITY.filter((state) => (stateCounts[state] ?? 0) > 0)
  const workspaceTargeted = isDropTarget(dropTarget, workspace.id)
  const dropLine = (tabId?: string) => (isDropTarget(dropTarget, workspace.id, tabId) ? 'border-dock-focus' : 'border-transparent')
  const handleToggle = () => onToggle(workspace.id)
  const handleChevron = (event: MouseEvent) => {
    event.stopPropagation()
    onToggle(workspace.id)
  }
  const stopClick = (event: MouseEvent) => event.stopPropagation()
  const handleCloseWorkspace = (event: MouseEvent) => {
    event.stopPropagation()
    onCloseWorkspace(workspace.id)
  }
  const handleSelect = (event: MouseEvent) => {
    event.stopPropagation()
    if (selected) {
      onStartRename(workspace.id)
    } else {
      onSelectWorkspace(workspace.id)
    }
  }

  return (
    <div className="mb-1">
      <div
        className={`group flex cursor-pointer items-baseline gap-1 rounded-md py-2.5 pr-1 text-[14px] leading-none select-none ${selected ? 'bg-dock-green-soft text-dock-green-deep' : 'text-dock-ink hover:bg-dock-green-hover'} ${workspaceTargeted && !expanded ? 'shadow-[inset_0_-2px_0_var(--color-dock-focus)]' : ''}`}
        data-drop-workspace={workspace.id}
        onClick={handleToggle}
      >
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={tabsId}
          aria-label={`${expanded ? 'Replier' : 'Afficher'} les onglets de ${workspace.name}`}
          data-tip={expanded ? 'Replier les onglets' : 'Afficher les onglets'}
          className="w-6 shrink-0 cursor-pointer self-center text-center text-sm text-dock-green"
          onClick={handleChevron}
        >
          {expanded ? '▾' : '▸'}
        </button>
        {renaming ? (
          <span className="flex min-w-0 flex-1" onClick={stopClick}>
            <InlineNameEditor value={workspace.name} label="Nom du workspace" className="min-w-0 flex-1 font-semibold" onCommit={onCommitRename} onCancel={onCancelRename} />
          </span>
        ) : selected ? (
          <EditableName name={workspace.name} className="py-0.5 leading-none font-semibold" onClick={handleSelect} />
        ) : (
          <button type="button" className="min-w-0 cursor-pointer truncate rounded px-1 text-left leading-none font-semibold hover:bg-dock-green-hover" data-tip="Sélectionner le workspace" onClick={handleSelect}>
            {workspace.name}
          </button>
        )}
        {presentStates.length > 0 && (
          <span className="ml-auto flex shrink-0 items-center gap-1.5 self-center">
            {presentStates.map((state) => (
              <span key={state} className="inline-flex items-center gap-0.5 text-[11px] leading-none">
                <AgentStateIcon state={state} tip={stateCountLabel(state, stateCounts[state] ?? 0)} />
                {(stateCounts[state] ?? 0) > 1 && <span className="text-dock-muted">{stateCounts[state]}</span>}
              </span>
            ))}
          </span>
        )}
        <span className={`${presentStates.length > 0 ? 'ml-2' : 'ml-auto'} shrink-0 text-[11px] leading-none text-dock-muted`}>{workspace.tabs.length} ong.</span>
        <button type="button" className={CLOSE_BUTTON} data-tip="Fermer le workspace" aria-label={`Fermer le workspace ${workspace.name}`} onClick={handleCloseWorkspace}>
          ×
        </button>
      </div>
      {expanded && (
        <ul id={tabsId} className="mt-1 mb-2 ml-5 border-l-2 border-dock-line pl-2">
          {workspace.tabs.map((tab) => {
            const activeTab = selected && tab.id === workspace.active
            const handleTab = () => onSelectTab(workspace.id, tab.id)
            const shellTag = shellTagOf(activePane(tab).shell)
            const paneCount = panesOf(tab.tree).length
            const tabSummary = tabAgents(tab, agents)
            const handleTabPointerDown = (event: PointerEvent<HTMLElement>) => beginTabDrag(event, tab.id, onMoveTab)
            const handleCloseTab = () => onCloseTab(tab.id)
            const handleTabAuxClick = (event: MouseEvent) => {
              if (event.button === MIDDLE_BUTTON) {
                onCloseTab(tab.id)
              }
            }
            return (
              <li key={tab.id} className={`border-t-2 ${dropLine(tab.id)}`}>
                <div className={`group flex items-center rounded pr-1 ${activeTab ? 'bg-dock-green-soft' : 'hover:bg-dock-green-hover'}`}>
                <button
                  type="button"
                  aria-current={activeTab || undefined}
                  data-tip={tab.name}
                  data-drop-workspace={workspace.id}
                  data-drop-tab={tab.id}
                  className={`flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded px-2 py-2 text-left text-[13px] ${activeTab ? 'font-semibold text-dock-green-deep' : 'text-dock-ink'} ${draggingTabId === tab.id ? 'opacity-50' : ''}`}
                  onClick={handleTab}
                  onAuxClick={handleTabAuxClick}
                  onPointerDown={handleTabPointerDown}
                >
                  {tabSummary && <AgentStateIcon state={tabSummary.state} tip={tabSummary.tip} />}
                  <span className="min-w-0 flex-1 truncate">{tab.name}</span>
                  {shellTag && <span className="shrink-0 rounded border border-dock-line px-1.5 py-px text-[10px] leading-tight font-medium text-dock-muted">{shellTag}</span>}
                  {paneCount > 1 && <span className="shrink-0 text-[11px] leading-none font-normal text-dock-muted" data-tip={`${paneCount} panes`}>{`${paneCount} panes`}</span>}
                </button>
                <button type="button" className={CLOSE_BUTTON} data-tip="Fermer l’onglet" aria-label={`Fermer l’onglet ${tab.name}`} onClick={handleCloseTab}>
                  ×
                </button>
                </div>
              </li>
            )
          })}
          <li aria-hidden="true" className={`border-t-2 ${dropLine()}`} />
        </ul>
      )}
    </div>
  )
})
