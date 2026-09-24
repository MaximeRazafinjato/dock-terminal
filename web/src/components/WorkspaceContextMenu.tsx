import { useLayoutEffect, useRef } from 'react'
import { ActionMenu, type ActionMenuItem } from './ActionMenu'
import type { PanelMenuRequest, WorkspacePanelActions } from './workspacePanel'

interface WorkspaceContextMenuProps {
  request: PanelMenuRequest
  actions: WorkspacePanelActions
  onRun: () => void
  onDismiss: () => void
}

const EDGE_MARGIN_PX = 8

const itemsFor = ({ workspaceId, tabId }: PanelMenuRequest, actions: WorkspacePanelActions): ActionMenuItem[] =>
  tabId
    ? [
        { id: 'rename-tab', label: 'Renommer', run: () => actions.startRenameTab(tabId) },
        { id: 'close-tab', label: 'Fermer l’onglet', run: () => actions.closeTab(tabId) },
      ]
    : [
        { id: 'rename-workspace', label: 'Renommer', run: () => actions.startRenameWorkspace(workspaceId) },
        { id: 'new-tab', label: 'Nouvel onglet PowerShell', run: () => actions.newTabIn(workspaceId) },
        { id: 'collapse-others', label: 'Replier les autres', run: () => actions.collapseOthers(workspaceId) },
        { id: 'close-workspace', label: 'Fermer le workspace', run: () => actions.closeWorkspace(workspaceId) },
      ]

export function WorkspaceContextMenu({ request, actions, onRun, onDismiss }: WorkspaceContextMenuProps) {
  const anchorRef = useRef<HTMLDivElement>(null)
  const { x, y, tabId } = request

  useLayoutEffect(() => {
    const anchor = anchorRef.current
    const menu = anchor?.querySelector<HTMLElement>('[role="menu"]')
    if (!anchor || !menu) {
      return
    }
    const { width, height } = menu.getBoundingClientRect()
    anchor.style.left = `${Math.max(EDGE_MARGIN_PX, Math.min(x, window.innerWidth - EDGE_MARGIN_PX - width))}px`
    anchor.style.top = `${y + height > window.innerHeight - EDGE_MARGIN_PX ? Math.max(EDGE_MARGIN_PX, y - height) : y}px`
  }, [x, y])

  const closingFirst = (item: ActionMenuItem): ActionMenuItem => ({
    ...item,
    run: () => {
      onRun()
      item.run()
    },
  })

  return (
    <div ref={anchorRef} className="fixed z-30" style={{ left: x, top: y }}>
      <div className="relative">
        <ActionMenu label={tabId ? 'Actions de l’onglet' : 'Actions du workspace'} items={itemsFor(request, actions).map(closingFirst)} onClose={onDismiss} />
      </div>
    </div>
  )
}
