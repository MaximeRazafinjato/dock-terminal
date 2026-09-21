import type React from 'react'
import type { Session } from '../model/session'

interface WorkspaceTreeProps {
  session: Session
  onSelectWorkspace: (workspaceId: string) => void
  onSelectTab: (workspaceId: string, tabId: string) => void
  onToggle: (workspaceId: string) => void
  onNewWorkspace: () => void
}

export function WorkspaceTree({ session, onSelectWorkspace, onSelectTab, onToggle, onNewWorkspace }: WorkspaceTreeProps) {
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
          const handleToggle = () => onToggle(workspace.id)
          const handleSelect = (event: React.MouseEvent) => {
            event.stopPropagation()
            onSelectWorkspace(workspace.id)
          }
          return (
            <div key={workspace.id} className="mb-1">
              <div
                role="button"
                aria-expanded={expanded}
                className={`flex cursor-pointer items-baseline gap-1 rounded-md py-2 pr-2 leading-none select-none ${selected ? 'bg-dock-green-soft text-dock-green-deep' : 'hover:bg-dock-green-hover'}`}
                onClick={handleToggle}
              >
                <span className="w-6 shrink-0 self-center text-center text-xs text-dock-muted">{expanded ? '▾' : '▸'}</span>
                <button type="button" className="min-w-0 truncate rounded px-1 text-left leading-none font-semibold hover:bg-dock-green-hover" title="Sélectionner le workspace" onClick={handleSelect}>
                  {workspace.name}
                </button>
                <span className="text-[10px] leading-none text-dock-muted">{workspace.tabs.length} ong.</span>
              </div>
              {expanded && (
                <ul className="mt-1 mb-2 ml-4 border-l border-dock-line pl-2">
                  {workspace.tabs.map((tab) => {
                    const activeTab = selected && tab.id === workspace.active
                    const handleTab = () => onSelectTab(workspace.id, tab.id)
                    return (
                      <li key={tab.id}>
                        <button
                          type="button"
                          className={`w-full truncate rounded px-2 py-1.5 text-left text-[11px] ${activeTab ? 'bg-dock-green-soft text-dock-green-deep' : 'text-dock-muted hover:bg-dock-green-hover'}`}
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
