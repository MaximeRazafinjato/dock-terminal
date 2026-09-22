import { findWorkspace, panesOf } from '../model/session'
import { useHostStore } from '../store/hostStore'
import { useSessionStore } from '../store/sessionStore'
import { terminalRegistry } from './terminalRegistry'

const tabOf = (tabId: string) =>
  useSessionStore
    .getState()
    .session?.workspaces.flatMap((workspace) => workspace.tabs)
    .find((tab) => tab.id === tabId)

export const closeTabKeepingText = (tabId: string): void => {
  const tab = tabOf(tabId)
  if (!tab) {
    return
  }
  const text = terminalRegistry.snapshot(panesOf(tab.tree).map((pane) => pane.id))
  useSessionStore.getState().closeTab(tabId, text)
  useHostStore.getState().setStatus('Onglet fermé. Ctrl + Maj + Z le rouvre avec un nouveau terminal.')
}

export const closeWorkspaceKeepingText = (workspaceId: string): void => {
  const { session, closeTab } = useSessionStore.getState()
  const workspace = session ? findWorkspace(session, workspaceId) : undefined
  if (!workspace) {
    return
  }
  for (const tab of workspace.tabs) {
    closeTab(tab.id, terminalRegistry.snapshot(panesOf(tab.tree).map((pane) => pane.id)))
  }
  useHostStore.getState().setStatus(`Workspace « ${workspace.name} » fermé. Ctrl + Maj + Z rouvre ses derniers onglets un par un.`)
}

export const closePaneKeepingText = (paneId: string): void => {
  const { session, closePane } = useSessionStore.getState()
  const tab = session?.workspaces.flatMap((workspace) => workspace.tabs).find((candidate) => panesOf(candidate.tree).some((pane) => pane.id === paneId))
  if (!tab) {
    return
  }
  if (panesOf(tab.tree).length === 1) {
    closeTabKeepingText(tab.id)
  } else {
    closePane(paneId)
  }
}

export const restoreClosedTab = (): void => {
  const restored = useSessionStore.getState().restoreTab()
  if (!restored) {
    useHostStore.getState().setStatus('Aucun onglet fermé à rouvrir.')
    return
  }
  for (const [paneId, text] of Object.entries(restored.text)) {
    terminalRegistry.prime(paneId, text)
  }
  useHostStore.getState().setStatus(`Onglet « ${restored.tab.name} » rouvert avec de nouveaux terminaux.`)
}
