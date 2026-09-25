import { focusActivePane, focusFileTree } from '../explorer/fileExplorerActions'
import { focusGitPanel } from '../git/gitFocus'
import { RightPanelView } from '../model/session'
import { useSessionStore } from '../store/sessionStore'

const PANEL_SELECTOR = '[data-right-panel]'

const focusView = (view: RightPanelView): void => (view === RightPanelView.Git ? focusGitPanel() : focusFileTree())

const focusIsInPanel = (): boolean => Boolean(document.activeElement?.closest(PANEL_SELECTOR))

export const togglePanelView = (view: RightPanelView, focusPanel: boolean): void => {
  const leaving = focusIsInPanel()
  const opened = useSessionStore.getState().togglePanelView(view)
  if (opened && focusPanel) {
    requestAnimationFrame(() => focusView(view))
  } else if (!opened && (leaving || focusPanel)) {
    focusActivePane()
  }
}

export const toggleRightPanel = (): void => {
  const leaving = focusIsInPanel()
  if (!useSessionStore.getState().toggleExplorer() && leaving) {
    focusActivePane()
  }
}

export const showPanelView = (view: RightPanelView): void => {
  useSessionStore.getState().setPanelView(view)
  requestAnimationFrame(() => focusView(view))
}
