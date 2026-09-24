import { useShallow } from 'zustand/react/shallow'
import type { Session } from '../model/session'
import { useAgentStore } from '../store/agentStore'
import { useUiStore } from '../store/uiStore'
import type { MoveTabHandler } from './tabDrag'
import { WorkspaceItem } from './WorkspaceItem'

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

export function WorkspaceTree({ session, renamingWorkspaceId, onSelectWorkspace, onStartRename, onCommitRename, onCancelRename, onSelectTab, onToggle, onNewWorkspace, onMoveTab, onCloseTab, onCloseWorkspace }: WorkspaceTreeProps) {
  const { draggingTabId, tabDropTarget } = useUiStore(useShallow((state) => ({ draggingTabId: state.draggingTabId, tabDropTarget: state.tabDropTarget })))
  const agents = useAgentStore((state) => state.agents)
  return (
    <aside className="flex h-full min-h-0 flex-col bg-dock-paper" style={{ width: session.sidebar }}>
      <div className="flex items-center justify-between px-3 py-2 text-[11px] font-semibold tracking-wide text-dock-muted uppercase">
        <span>Workspaces</span>
        <button type="button" className="rounded px-2 text-base hover:bg-dock-green-hover" data-tip="Nouveau workspace" onClick={onNewWorkspace}>
          +
        </button>
      </div>
      <nav className="min-h-0 flex-1 overflow-auto px-2">
        {session.workspaces.map((workspace) => (
          <WorkspaceItem
            key={workspace.id}
            workspace={workspace}
            selected={workspace.id === session.active}
            renaming={workspace.id === renamingWorkspaceId}
            agents={agents}
            draggingTabId={workspace.tabs.some((tab) => tab.id === draggingTabId) ? draggingTabId : null}
            dropTarget={tabDropTarget?.workspaceId === workspace.id ? tabDropTarget : null}
            onSelectWorkspace={onSelectWorkspace}
            onStartRename={onStartRename}
            onCommitRename={onCommitRename}
            onCancelRename={onCancelRename}
            onSelectTab={onSelectTab}
            onToggle={onToggle}
            onMoveTab={onMoveTab}
            onCloseTab={onCloseTab}
            onCloseWorkspace={onCloseWorkspace}
          />
        ))}
      </nav>
    </aside>
  )
}
