import { useMemo } from 'react'
import type { ShellProfile } from '../bridge/messages'
import type { Session } from '../model/session'
import { buildPaletteItems, type PaletteItem } from '../palette/paletteItems'
import { SearchDialog } from './SearchDialog'

interface CommandPaletteProps {
  session: Session
  shells: ShellProfile[]
  onClose: () => void
  onRun: (item: PaletteItem) => void
  onToggleFavorite: (commandId: string) => void
}

export function CommandPalette({ session, shells, onClose, onRun, onToggleFavorite }: CommandPaletteProps) {
  const items = useMemo(() => buildPaletteItems(session, shells), [session, shells])
  const handleToggleFavorite = (item: PaletteItem) => onToggleFavorite(item.id)

  return (
    <SearchDialog
      label="Commandes et navigation"
      placeholder="Commande, workspace, onglet ou pane…"
      emptyMessage="Aucun résultat."
      items={items}
      onClose={onClose}
      onRun={onRun}
      onToggleFavorite={handleToggleFavorite}
    />
  )
}
