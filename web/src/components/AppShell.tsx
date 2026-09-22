import { useEffect } from 'react'
import type { Project } from '../bridge/messages'
import { activeTab, activeWorkspace, DEFAULT_SHELL, findWorkspace, type Session, type SplitAxis, type SplitPath, type Workspace } from '../model/session'
import type { PaletteItem } from '../palette/paletteItems'
import { useHostStore, StatusLevel } from '../store/hostStore'
import { useSessionStore } from '../store/sessionStore'
import { RenameOrigin, useUiStore } from '../store/uiStore'
import { changePaneShell, dismissPaneState, restartPane, restartPaneIn } from '../terminal/paneLifecycle'
import { closePaneKeepingText, closeTabKeepingText, closeWorkspaceKeepingText, restoreClosedTab } from '../terminal/tabLifecycle'
import { terminalRegistry } from '../terminal/terminalRegistry'
import { CommandPalette } from './CommandPalette'
import { EmptyState } from './EmptyState'
import { Header } from './Header'
import { ProjectPicker } from './ProjectPicker'
import { SidebarResizer } from './SidebarResizer'
import { SplitView } from './SplitView'
import { TabBar } from './TabBar'
import { Tooltip } from './Tooltip'
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
  const { selectWorkspace, selectTab, selectPane, toggleWorkspace, toggleSidebar, setSidebarWidth, newWorkspace, renameWorkspace, newTab, renameTab, moveTab, splitPane, setSplitRatio, toggleFavorite } = useSessionStore()
  const { status, leaderActive, home, shells, projects, projectsRoot, projectsError, unsaved } = useHostStore()
  const { renamingWorkspaceId, renameOrigin, startRenamingWorkspace, stopRenamingWorkspace, renamingTabId, startRenamingTab, stopRenamingTab, paletteOpen, openPalette, closePalette, projectPickerOpen, closeProjectPicker } = useUiStore()
  const workspace = activeWorkspace(session)
  const tab = workspace ? activeTab(workspace) : undefined
  const availableShells = shells.filter((shell) => shell.available)

  const focusActivePane = () => {
    if (tab) {
      focusPane(tab.active)
    }
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.defaultPrevented && event.ctrlKey && !event.altKey && event.key.toLowerCase() === 'p') {
        event.preventDefault()
        openPalette()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [openPalette])

  const handleClosePalette = () => {
    closePalette()
    focusActivePane()
  }
  const handleRunPaletteItem = (item: PaletteItem) => {
    handleClosePalette()
    item.run()
  }
  const handleCloseProjectPicker = () => {
    closeProjectPicker()
    focusActivePane()
  }
  const handleSelectProject = (project: Project) => {
    closeProjectPicker()
    newWorkspace(project.name, project.path, DEFAULT_SHELL)
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
  const handleSplit = (paneId: string, axis: SplitAxis) => {
    selectPane(paneId)
    splitPane(axis)
  }

  const renderMain = (current: Workspace) => {
    const currentTab = activeTab(current)
    const handleResize = (path: SplitPath, ratio: number) => setSplitRatio(currentTab.id, path, ratio)
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
          <SplitView key={currentTab.id} node={currentTab.tree} activePaneId={currentTab.active} onFocus={selectPane} onClose={closePaneKeepingText} onSplit={handleSplit} onResize={handleResize} shells={availableShells} onRestart={restartPane} onRestartIn={restartPaneIn} onChangeShell={changePaneShell} onDismissState={dismissPaneState} />
        </div>
      </>
    )
  }

  return (
    <div className="relative flex h-full flex-col">
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
              onCloseTab={closeTabKeepingText}
              onCloseWorkspace={closeWorkspaceKeepingText}
            />
            <SidebarResizer width={session.sidebar} onResize={setSidebarWidth} />
          </>
        )}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {workspace ? renderMain(workspace) : <EmptyState canRestore={session.closed.length > 0} onNewWorkspace={handleNewWorkspace} onRestoreTab={restoreClosedTab} />}
        </main>
      </div>
      {projectPickerOpen && <ProjectPicker projects={projects} root={projectsRoot} error={projectsError} onClose={handleCloseProjectPicker} onSelect={handleSelectProject} />}
      {paletteOpen && <CommandPalette session={session} shells={availableShells} onClose={handleClosePalette} onRun={handleRunPaletteItem} onToggleFavorite={toggleFavorite} />}
      <Tooltip />
      <footer className={`flex h-[24px] shrink-0 items-center border-t border-dock-line bg-dock-paper px-3 font-mono text-[11px] ${STATUS_CLASSES[status.level]}`}>
        <span className="truncate">{status.text}</span>
        {unsaved && (
          <span className="ml-auto shrink-0 pl-3 text-dock-error" data-tip="La dernière sauvegarde a échoué : la session restera en l’état d’avant tant qu’une écriture ne réussit pas.">
            Non enregistré
          </span>
        )}
      </footer>
    </div>
  )
}
