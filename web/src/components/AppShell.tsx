import { activeTab, activeWorkspace, DEFAULT_SHELL, findWorkspace, type Session, type Workspace } from '../model/session'
import { useHostStore, StatusLevel } from '../store/hostStore'
import { useSessionStore } from '../store/sessionStore'
import { RenameOrigin, useUiStore } from '../store/uiStore'
import { closePaneKeepingText, closeTabKeepingText, restoreClosedTab } from '../terminal/tabLifecycle'
import { terminalRegistry } from '../terminal/terminalRegistry'
import { EmptyState } from './EmptyState'
import { Header } from './Header'
import { SidebarResizer } from './SidebarResizer'
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

const focusPane = (paneId: string) => terminalRegistry.get(paneId)?.terminal.focus()

export function AppShell({ session }: AppShellProps) {
  const { selectWorkspace, selectTab, selectPane, toggleWorkspace, toggleSidebar, setSidebarWidth, newWorkspace, renameWorkspace, newTab, renameTab, moveTab } = useSessionStore()
  const { status, leaderActive, home, shells } = useHostStore()
  const { renamingWorkspaceId, renameOrigin, startRenamingWorkspace, stopRenamingWorkspace, renamingTabId, startRenamingTab, stopRenamingTab } = useUiStore()
  const workspace = activeWorkspace(session)
  const tab = workspace ? activeTab(workspace) : undefined
  const availableShells = shells.filter((shell) => shell.available)

  const focusActivePane = () => {
    if (tab) {
      focusPane(tab.active)
    }
  }
  const handleSelectTab = (workspaceId: string, tabId: string) => {
    selectWorkspace(workspaceId)
    selectTab(tabId)
    const target = findWorkspace(session, workspaceId)?.tabs.find((candidate) => candidate.id === tabId)
    if (target) {
      focusPane(target.active)
    }
  }
  const handleToggleSidebar = () => {
    if (!session.sidebarCollapsed && document.activeElement?.closest('aside')) {
      focusActivePane()
    }
    toggleSidebar()
  }
  const handleNewWorkspace = () => startRenamingWorkspace(newWorkspace(`Workspace ${session.workspaces.length + 1}`, home, DEFAULT_SHELL), RenameOrigin.Panel)
  const handleStartRename = () => {
    if (workspace) {
      startRenamingWorkspace(workspace.id, RenameOrigin.Header)
    }
  }
  const handleStartRenameFromPanel = (workspaceId: string) => startRenamingWorkspace(workspaceId, RenameOrigin.Panel)
  const finishRename = () => {
    stopRenamingWorkspace()
    focusActivePane()
  }
  const handleCommitRename = (name: string) => {
    if (workspace) {
      renameWorkspace(workspace.id, name)
    }
    finishRename()
  }
  const finishTabRename = () => {
    stopRenamingTab()
    focusActivePane()
  }
  const handleCommitTabRename = (name: string) => {
    if (renamingTabId) {
      renameTab(renamingTabId, name)
    }
    finishTabRename()
  }

  const renderMain = (current: Workspace) => {
    const currentTab = activeTab(current)
    return (
      <>
        <TabBar
          workspace={current}
          shells={availableShells}
          renamingTabId={renamingTabId}
          onSelect={selectTab}
          onStartRename={startRenamingTab}
          onCommitRename={handleCommitTabRename}
          onCancelRename={finishTabRename}
          onClose={closeTabKeepingText}
          onNew={newTab}
          onMove={moveTab}
        />
        <div className="min-h-0 flex-1 border-t border-dock-line bg-dock-panel p-1">
          <SplitView key={currentTab.id} node={currentTab.tree} activePaneId={currentTab.active} onFocus={selectPane} onClose={closePaneKeepingText} />
        </div>
      </>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <Header
        workspaceName={workspace?.name ?? null}
        renaming={workspace !== undefined && renamingWorkspaceId === workspace.id && renameOrigin === RenameOrigin.Header}
        sidebarCollapsed={session.sidebarCollapsed}
        leaderActive={leaderActive}
        onToggleSidebar={handleToggleSidebar}
        onStartRename={handleStartRename}
        onCommitRename={handleCommitRename}
        onCancelRename={finishRename}
      />
      <div className="flex min-h-0 flex-1">
        {!session.sidebarCollapsed && (
          <>
            <WorkspaceTree
              session={session}
              renamingWorkspaceId={renameOrigin === RenameOrigin.Panel ? renamingWorkspaceId : null}
              onSelectWorkspace={selectWorkspace}
              onStartRename={handleStartRenameFromPanel}
              onCommitRename={handleCommitRename}
              onCancelRename={finishRename}
              onSelectTab={handleSelectTab}
              onToggle={toggleWorkspace}
              onNewWorkspace={handleNewWorkspace}
              onMoveTab={moveTab}
            />
            <SidebarResizer width={session.sidebar} onResize={setSidebarWidth} />
          </>
        )}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {workspace ? renderMain(workspace) : <EmptyState canRestore={session.closed.length > 0} onNewWorkspace={handleNewWorkspace} onRestoreTab={restoreClosedTab} />}
        </main>
      </div>
      <footer className={`flex h-[24px] shrink-0 items-center border-t border-dock-line bg-dock-paper px-3 font-mono text-[11px] ${STATUS_CLASSES[status.level]}`}>
        <span className="truncate">{status.text}</span>
      </footer>
    </div>
  )
}
