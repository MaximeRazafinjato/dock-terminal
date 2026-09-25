import type { ActionMenuItem } from './ActionMenu'
import { FloatingMenu } from './FloatingMenu'
import type { PanelMenuRequest, WorkspacePanelActions } from './workspacePanel'

interface WorkspaceContextMenuProps {
  request: PanelMenuRequest
  actions: WorkspacePanelActions
  onRun: () => void
  onDismiss: () => void
}

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
  const { x, y, tabId } = request

  const closingFirst = (item: ActionMenuItem): ActionMenuItem => ({
    ...item,
    run: () => {
      onRun()
      item.run()
    },
  })

  return <FloatingMenu x={x} y={y} label={tabId ? 'Actions de l’onglet' : 'Actions du workspace'} items={itemsFor(request, actions).map(closingFirst)} onClose={onDismiss} />
}
