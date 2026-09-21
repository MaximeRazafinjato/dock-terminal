import type React from 'react'
import type { Session } from '../model/session'
import { EditableName } from './EditableName'
import { InlineNameEditor } from './InlineNameEditor'

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
}

export function WorkspaceTree({ session, renamingWorkspaceId, onSelectWorkspace, onStartRename, onCommitRename, onCancelRename, onSelectTab, onToggle, onNewWorkspace }: WorkspaceTreeProps) {
  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-dock-line bg-dock-paper" style={{ width: session.sidebar }}>
      <div className="flex items-center justify-between px-3 py-2 text-[11px] font-semibold tracking-wide text-dock-muted uppercase">
        <span>Workspaces</span>
        <button type="button" className="rounded px-2 text-base hover:bg-dock-green-hover" title="Nouveau workspace" onClick={onNewWorkspace}>
          +
        </button>
      </div>
      <nav className="min-h-0 flex-1 overflow-auto px-2">
        {session.workspaces.map((workspace) => {
          const selected = workspace.id === session.active
          const expanded = workspace.expanded ?? selected
          const tabsId = `workspace-tabs-${workspace.id}`
          const handleToggle = () => onToggle(workspace.id)
          const handleChevron = (event: React.MouseEvent) => {
            event.stopPropagation()
            onToggle(workspace.id)
          }
          const renaming = workspace.id === renamingWorkspaceId
          const stopClick = (event: React.MouseEvent) => event.stopPropagation()
          const handleSelect = (event: React.MouseEvent) => {
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
                className={`flex cursor-pointer items-baseline gap-1 rounded-md py-2.5 pr-2 text-[14px] leading-none select-none ${selected ? 'bg-dock-green-soft text-dock-green-deep' : 'text-dock-ink hover:bg-dock-green-hover'}`}
                onClick={handleToggle}
              >
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={tabsId}
                  aria-label={`${expanded ? 'Replier' : 'Afficher'} les onglets de ${workspace.name}`}
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
                  <button type="button" className="min-w-0 cursor-pointer truncate rounded px-1 text-left leading-none font-semibold hover:bg-dock-green-hover" title="Sélectionner le workspace" onClick={handleSelect}>
                    {workspace.name}
                  </button>
                )}
                <span className="text-[11px] leading-none text-dock-muted">{workspace.tabs.length} ong.</span>
              </div>
              {expanded && (
                <ul id={tabsId} className="mt-1 mb-2 ml-5 border-l-2 border-dock-line pl-2">
                  {workspace.tabs.map((tab) => {
                    const activeTab = selected && tab.id === workspace.active
                    const handleTab = () => onSelectTab(workspace.id, tab.id)
                    return (
                      <li key={tab.id}>
                        <button
                          type="button"
                          aria-current={activeTab || undefined}
                          title={tab.name}
                          className={`w-full cursor-pointer truncate rounded px-2 py-2 text-left text-[13px] ${activeTab ? 'bg-dock-green-soft font-semibold text-dock-green-deep' : 'text-dock-ink hover:bg-dock-green-hover'}`}
                          onClick={handleTab}
                        >
                          {tab.name}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
