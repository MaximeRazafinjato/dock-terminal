import { useCallback, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import type { ShellProfile } from '../bridge/messages'
import { DEFAULT_SHELL, type Workspace } from '../model/session'
import { ShellMenu } from './ShellMenu'

interface TabBarProps {
  workspace: Workspace
  shells: ShellProfile[]
  onSelect: (tabId: string) => void
  onClose: (tabId: string) => void
  onNew: (shellId: string) => void
}

const isMenuKey = (event: KeyboardEvent): boolean => (event.shiftKey && event.key === 'F10') || event.key === 'ContextMenu'

export function TabBar({ workspace, shells, onSelect, onClose, onNew }: TabBarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const addButtonRef = useRef<HTMLButtonElement>(null)

  const handleNewDefault = () => onNew(DEFAULT_SHELL)
  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault()
    setMenuOpen(true)
  }
  const handleAddKeyDown = (event: KeyboardEvent) => {
    if (isMenuKey(event)) {
      event.preventDefault()
      setMenuOpen(true)
    }
  }
  const handleCloseMenu = useCallback(() => {
    setMenuOpen(false)
    addButtonRef.current?.focus()
  }, [])
  const handleSelectShell = (shellId: string) => {
    setMenuOpen(false)
    onNew(shellId)
  }

  return (
    <div role="tablist" className="flex shrink-0 items-center gap-1 px-2 pt-1">
      {workspace.tabs.map((tab) => {
        const active = tab.id === workspace.active
        const handleSelect = () => onSelect(tab.id)
        const handleClose = () => onClose(tab.id)
        return (
          <div
            key={tab.id}
            className={`flex min-w-[100px] items-center rounded-t-md border border-b-0 ${active ? 'border-dock-line bg-dock-panel text-dock-green-deep' : 'border-transparent text-dock-muted hover:bg-dock-green-hover'}`}
          >
            <button type="button" role="tab" aria-selected={active} className="min-w-0 flex-1 cursor-pointer truncate px-3 py-2 text-left text-xs" onClick={handleSelect}>
              {tab.name}
            </button>
            <button type="button" className="shrink-0 cursor-pointer px-2 text-xs hover:text-dock-error" title="Fermer l’onglet" onClick={handleClose}>
              ×
            </button>
          </div>
        )
      })}
      <div className="relative">
        <button
          ref={addButtonRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="cursor-pointer rounded px-2 py-1 text-base hover:bg-dock-green-hover"
          title="Nouvel onglet PowerShell (clic droit : choisir le shell)"
          onClick={handleNewDefault}
          onContextMenu={handleContextMenu}
          onKeyDown={handleAddKeyDown}
        >
          +
        </button>
        {menuOpen && <ShellMenu shells={shells} onSelect={handleSelectShell} onClose={handleCloseMenu} />}
      </div>
    </div>
  )
}
