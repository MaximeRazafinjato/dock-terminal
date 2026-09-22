import type { MouseEvent, PointerEvent } from 'react'
import { activePane, DEFAULT_SHELL, panesOf, type Session } from '../model/session'
import { EditableName } from './EditableName'
import { useUiStore } from '../store/uiStore'
import { InlineNameEditor } from './InlineNameEditor'
import { beginTabDrag, isDropTarget, type MoveTabHandler } from './tabDrag'

const SHELL_TAGS: Record<string, string> = { pwsh: 'PS 7', cmd: 'CMD', gitbash: 'Git Bash' }

const shellTagOf = (shell: string): string | null => (shell === DEFAULT_SHELL ? null : (SHELL_TAGS[shell] ?? shell))

interface WorkspaceTreeProps {
  session: Session
  renamingWorkspaceId: string | null
  onSelectWorkspace: (workspaceId: string) => void
  onStartRename: (workspaceId: string) => void
  onCommitRename: (name: string) => void
  onCancelRename: () => void
  onSelectTab: (workspaceId: string, tabId: string) => void
  onToggle: (workspaceId: string) => void
  onNewWorkspace: () => void
  onMoveTab: MoveTabHandler
  onCloseTab: (tabId: string) => void
  onCloseWorkspace: (workspaceId: string) => void
}

const MIDDLE_BUTTON = 1
const CLOSE_BUTTON = 'shrink-0 cursor-pointer rounded px-1.5 text-[13px] leading-none opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-dock-green-hover hover:text-dock-error'

export function WorkspaceTree({ session, renamingWorkspaceId, onSelectWorkspace, onStartRename, onCommitRename, onCancelRename, onSelectTab, onToggle, onNewWorkspace, onMoveTab, onCloseTab, onCloseWorkspace }: WorkspaceTreeProps) {
  const { draggingTabId, tabDropTarget } = useUiStore()
  const dropLine = (workspaceId: string, tabId?: string) => (isDropTarget(tabDropTarget, workspaceId, tabId) ? 'border-dock-focus' : 'border-transparent')
  return (
    <aside className="flex h-full min-h-0 flex-col bg-dock-paper" style={{ width: session.sidebar }}>
      <div className="flex items-center justify-between px-3 py-2 text-[11px] font-semibold tracking-wide text-dock-muted uppercase">
        <span>Workspaces</span>
        <button type="button" className="rounded px-2 text-base hover:bg-dock-green-hover" data-tip="Nouveau workspace" onClick={onNewWorkspace}>
          +
        </button>
      </div>
      <nav className="min-h-0 flex-1 overflow-auto px-2">
        {session.workspaces.map((workspace) => {
          const selected = workspace.id === session.active
          const expanded = workspace.expanded ?? selected
          const tabsId = `workspace-tabs-${workspace.id}`
          const handleToggle = () => onToggle(workspace.id)
          const handleChevron = (event: MouseEvent) => {
            event.stopPropagation()
            onToggle(workspace.id)
          }
          const renaming = workspace.id === renamingWorkspaceId
          const workspaceTargeted = isDropTarget(tabDropTarget, workspace.id)
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
            <div key={workspace.id} className="mb-1">
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
                <span className="ml-auto shrink-0 text-[11px] leading-none text-dock-muted">{workspace.tabs.length} ong.</span>
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
                    const handleTabPointerDown = (event: PointerEvent<HTMLElement>) => beginTabDrag(event, tab.id, onMoveTab)
                    const handleCloseTab = () => onCloseTab(tab.id)
                    const handleTabAuxClick = (event: MouseEvent) => {
                      if (event.button === MIDDLE_BUTTON) {
                        onCloseTab(tab.id)
                      }
                    }
                    return (
                      <li key={tab.id} className={`border-t-2 ${dropLine(workspace.id, tab.id)}`}>
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
                  <li aria-hidden="true" className={`border-t-2 ${dropLine(workspace.id)}`} />
                </ul>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
