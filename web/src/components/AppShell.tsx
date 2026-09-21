import { activeTab, activeWorkspace, type Session } from '../model/session'
import { useHostStore, StatusLevel } from '../store/hostStore'
import { useSessionStore } from '../store/sessionStore'
import { useUiStore } from '../store/uiStore'
import { terminalRegistry } from '../terminal/terminalRegistry'
import { Header } from './Header'
import { SplitView } from './SplitView'
import { TabBar } from './TabBar'
import { WorkspaceTree } from './WorkspaceTree'

const STATUS_CLASSES: Record<StatusLevel, string> = {
  [StatusLevel.Info]: 'text-dock-muted',
  [StatusLevel.Warning]: 'text-dock-warning',
  [StatusLevel.Error]: 'text-dock-error',
}

interface AppShellProps {
  session: Session
}

export function AppShell({ session }: AppShellProps) {
  const { selectWorkspace, selectTab, selectPane, toggleWorkspace, toggleSidebar, newWorkspace, renameWorkspace, newTab, closeTab, closePane } = useSessionStore()
  const { status, leaderActive, home } = useHostStore()
  const { renamingWorkspaceId, startRenamingWorkspace, stopRenamingWorkspace } = useUiStore()
  const workspace = activeWorkspace(session)
  const tab = activeTab(workspace)

  const handleSelectTab = (workspaceId: string, tabId: string) => {
    selectWorkspace(workspaceId)
    selectTab(tabId)
  }
  const handleNewWorkspace = () => startRenamingWorkspace(newWorkspace(`Workspace ${session.workspaces.length + 1}`, home, 'powershell'))
  const handleStartRename = () => startRenamingWorkspace(workspace.id)
  const finishRename = () => {
    stopRenamingWorkspace()
    terminalRegistry.get(tab.active)?.terminal.focus()
  }
  const handleCommitRename = (name: string) => {
    renameWorkspace(workspace.id, name)
    finishRename()
  }
  const handleNewTab = () => newTab('powershell')

  return (
    <div className="flex h-full flex-col">
      <Header
        workspaceName={workspace.name}
        renaming={renamingWorkspaceId === workspace.id}
        sidebarCollapsed={session.sidebarCollapsed}
        leaderActive={leaderActive}
        onToggleSidebar={toggleSidebar}
        onStartRename={handleStartRename}
        onCommitRename={handleCommitRename}
        onCancelRename={finishRename}
      />
      <div className="flex min-h-0 flex-1">
        {!session.sidebarCollapsed && (
          <WorkspaceTree
            session={session}
            onSelectWorkspace={selectWorkspace}
            onSelectTab={handleSelectTab}
            onToggle={toggleWorkspace}
            onNewWorkspace={handleNewWorkspace}
          />
        )}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <TabBar workspace={workspace} onSelect={selectTab} onClose={closeTab} onNew={handleNewTab} />
          <div className="min-h-0 flex-1 border-t border-dock-line bg-dock-panel p-1">
            <SplitView key={tab.id} node={tab.tree} activePaneId={tab.active} onFocus={selectPane} onClose={closePane} />
          </div>
        </main>
      </div>
      <footer className={`flex h-[24px] shrink-0 items-center border-t border-dock-line bg-dock-paper px-3 font-mono text-[11px] ${STATUS_CLASSES[status.level]}`}>
        <span className="truncate">{status.text}</span>
      </footer>
    </div>
  )
}
