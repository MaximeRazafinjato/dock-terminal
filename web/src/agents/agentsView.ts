import { focusActivePane } from '../explorer/fileExplorerActions'
import { RightPanelView, SidebarView, type Session } from '../model/session'
import { openPanelView, showFileChanges } from '../panel/rightPanel'
import { useSessionStore } from '../store/sessionStore'
import { joinPane } from '../terminal/terminalActions'

export const LEFT_PANEL_SELECTOR = '[data-left-panel]'
export const AGENTS_VIEW_SELECTOR = '[data-agents-view]'
export const AGENT_CARD_SELECTOR = '[data-agent-card]'

export const agentsViewShown = (session: Session): boolean => !session.sidebarCollapsed && session.sidebarView === SidebarView.Agents

export const focusAgentsView = (): void => {
  const view = document.querySelector<HTMLElement>(AGENTS_VIEW_SELECTOR)
  const card = view?.querySelector<HTMLElement>(`${AGENT_CARD_SELECTOR}[aria-current="true"]`) ?? view?.querySelector<HTMLElement>(AGENT_CARD_SELECTOR)
  ;(card ?? view)?.focus()
}

export const toggleAgentsView = (): void => {
  const { session, setSidebarView } = useSessionStore.getState()
  if (!session) {
    return
  }
  if (agentsViewShown(session)) {
    const focusInView = Boolean(document.activeElement?.closest(AGENTS_VIEW_SELECTOR))
    setSidebarView(SidebarView.Workspaces)
    if (focusInView) {
      focusActivePane()
    }
    return
  }
  setSidebarView(SidebarView.Agents)
  requestAnimationFrame(focusAgentsView)
}

export const showWorkspacesView = (): void => {
  const { session, setSidebarView } = useSessionStore.getState()
  if (session?.sidebarView === SidebarView.Agents) {
    setSidebarView(SidebarView.Workspaces)
  }
}

export const openAgentFileChanges = (paneId: string, path: string): void => {
  joinPane(paneId)
  openPanelView(RightPanelView.Git)
  showFileChanges(path)
}
