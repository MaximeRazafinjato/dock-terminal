import type { ShellProfile } from '../bridge/messages'
import { ActionMenu } from './ActionMenu'

interface ShellMenuProps {
  shells: ShellProfile[]
  onSelect: (shellId: string) => void
  onClose: () => void
}

export function ShellMenu({ shells, onSelect, onClose }: ShellMenuProps) {
  const items = shells.map((shell) => ({ id: shell.id, label: shell.name, run: () => onSelect(shell.id) }))
  return <ActionMenu label="Choisir le shell" items={items} emptyMessage="Aucun shell disponible" onClose={onClose} />
}
