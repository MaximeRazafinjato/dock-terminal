import { useEffect } from 'react'
import { OpenTarget } from '../bridge/messages'
import type { Pane } from '../model/session'
import { useHostStore } from '../store/hostStore'
import { copyPaneBranch, copyPanePath, gitSummary, newTabInPaneFolder, openPaneFolder, queryContext } from '../terminal/contextActions'
import { ActionMenu, type ActionMenuItem } from './ActionMenu'

interface PaneActionsMenuProps {
  pane: Pane
  onClose: () => void
}

export function PaneActionsMenu({ pane, onClose }: PaneActionsMenuProps) {
  const context = useHostStore((state) => state.contexts[pane.id])

  useEffect(() => {
    queryContext(pane.id)
  }, [pane.id, pane.path])

  const runThenClose = (action: (paneId: string) => void) => () => {
    onClose()
    action(pane.id)
  }
  const items: ActionMenuItem[] = [
    { id: 'copy-path', label: 'Copier le chemin', run: runThenClose(copyPanePath) },
    { id: 'open-editor', label: 'Ouvrir dans l’éditeur', run: runThenClose((paneId) => openPaneFolder(paneId, OpenTarget.Editor)) },
    { id: 'open-explorer', label: 'Ouvrir dans l’explorateur', run: runThenClose((paneId) => openPaneFolder(paneId, OpenTarget.Explorer)) },
    { id: 'copy-branch', label: 'Copier la branche', disabled: !context?.branch, run: runThenClose(copyPaneBranch) },
    { id: 'new-tab-here', label: 'Nouvel onglet dans ce dossier', run: runThenClose(newTabInPaneFolder) },
  ]
  const header = (
    <div className="mb-1 border-b border-dock-line px-3 py-2 text-[11px]">
      <div className="truncate font-mono text-dock-green" title={pane.path}>
        {pane.path}
      </div>
      <div className="text-dock-muted">{gitSummary(context)}</div>
    </div>
  )

  return <ActionMenu label="Actions sur le dossier du pane" items={items} header={header} align="right" onClose={onClose} />
}
