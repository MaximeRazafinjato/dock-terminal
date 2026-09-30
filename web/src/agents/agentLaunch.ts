import { bridge } from '../bridge/bridge'
import { focusActivePane } from '../explorer/fileExplorerActions'
import { activePane, activeTab, activeWorkspace, AgentLaunchMode, AgentLaunchTarget, DEFAULT_SHELL, folderName, type AgentLaunchPreferences } from '../model/session'
import { ACTIVE_PANE_SOURCE, NEW_WORKTREE_SOURCE, useAgentLaunchStore, type AgentLaunchDraft } from '../store/agentLaunchStore'
import { StatusLevel, useHostStore } from '../store/hostStore'
import { useSessionStore } from '../store/sessionStore'
import { focusPane } from '../terminal/terminalActions'
import { terminalRegistry } from '../terminal/terminalRegistry'
import { openWorktreeDialog } from '../worktree/worktreeActions'
import { registerLaunchTask } from './launchTasks'

let nextRequest = 0

const DEFAULT_PREFERENCES: AgentLaunchPreferences = { mode: AgentLaunchMode.Default, target: AgentLaunchTarget.Tab }

const currentPane = () => {
  const { session } = useSessionStore.getState()
  const workspace = session ? activeWorkspace(session) : undefined
  return workspace ? activePane(activeTab(workspace)) : undefined
}

export const launchPreferences = (): AgentLaunchPreferences => useSessionStore.getState().session?.agentLaunch ?? DEFAULT_PREFERENCES

export const activeRepository = (): string | null => {
  const pane = currentPane()
  return pane && useHostStore.getState().contexts[pane.id]?.isRepository ? pane.path : null
}

export const openAgentLaunch = (): void => {
  bridge.send({ type: 'projects.list' })
  const { mode, target } = launchPreferences()
  useAgentLaunchStore.getState().setDraft({ source: ACTIVE_PANE_SOURCE, task: '', mode, target, request: null })
}

export const changeAgentLaunch = (patch: Partial<AgentLaunchDraft>): void => {
  const { draft, setDraft } = useAgentLaunchStore.getState()
  if (draft) {
    setDraft({ ...draft, ...patch })
  }
}

export const closeAgentLaunch = (): void => {
  useAgentLaunchStore.getState().setDraft(null)
  focusActivePane()
}

export const submitAgentLaunch = (): void => {
  const { draft, setDraft } = useAgentLaunchStore.getState()
  if (!draft || draft.request !== null || draft.task.trim().length === 0) {
    return
  }
  useSessionStore.getState().setAgentLaunch({ mode: draft.mode, target: draft.target })
  if (draft.source === NEW_WORKTREE_SOURCE) {
    const repository = activeRepository()
    if (repository) {
      setDraft(null)
      openWorktreeDialog(repository, { launch: true, task: draft.task, launchMode: draft.mode })
    }
    return
  }
  nextRequest += 1
  setDraft({ ...draft, request: nextRequest })
  bridge.send({ type: 'agent.prepareLaunch', request: nextRequest, launchMode: draft.mode, shell: DEFAULT_SHELL })
}

export const openLaunchPane = (path: string, target: AgentLaunchTarget): string | undefined => {
  const store = useSessionStore.getState()
  if (target === AgentLaunchTarget.Workspace || !currentPane()) {
    store.newWorkspace(folderName(path), path, DEFAULT_SHELL)
  } else if (target === AgentLaunchTarget.Split) {
    store.splitPaneAt(path, DEFAULT_SHELL)
  } else {
    store.newTabAt(path, DEFAULT_SHELL)
  }
  return currentPane()?.id
}

export const receiveLaunchPrepared = (request: number, sessionId: string, command: string): void => {
  const { draft, setDraft } = useAgentLaunchStore.getState()
  if (!draft || draft.request !== request) {
    return
  }
  const path = draft.source === ACTIVE_PANE_SOURCE ? currentPane()?.path : draft.source
  const paneId = path ? openLaunchPane(path, draft.target) : undefined
  if (!path || !paneId) {
    setDraft({ ...draft, request: null })
    useHostStore.getState().setStatus('Aucun dossier où lancer l’agent.', StatusLevel.Error)
    return
  }
  terminalRegistry.runAtStart(paneId, command)
  registerLaunchTask(paneId, sessionId, draft.task)
  setDraft(null)
  requestAnimationFrame(() => requestAnimationFrame(() => focusPane(paneId)))
  useHostStore.getState().setStatus(`Claude Code démarre dans ${folderName(path)} : la tâche lui sera collée dès qu’il sera prêt.`)
}
