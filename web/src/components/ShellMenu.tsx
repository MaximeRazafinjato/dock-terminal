import { useEffect, useRef, type KeyboardEvent } from 'react'
import type { ShellProfile } from '../bridge/messages'

interface ShellMenuProps {
  shells: ShellProfile[]
  onSelect: (shellId: string) => void
  onClose: () => void
}

const itemsOf = (menu: HTMLDivElement | null): HTMLButtonElement[] => Array.from(menu?.querySelectorAll('button') ?? [])

export function ShellMenu({ shells, onSelect, onClose }: ShellMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const menu = menuRef.current
    itemsOf(menu)[0]?.focus()
    const handleOutside = (event: PointerEvent) => {
      if (!menu?.contains(event.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('pointerdown', handleOutside)
    return () => document.removeEventListener('pointerdown', handleOutside)
  }, [onClose])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = itemsOf(menuRef.current)
    const index = items.findIndex((item) => item === document.activeElement)
    const moves: Record<string, number> = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: items.length - 1 }
    if (event.key in moves) {
      event.preventDefault()
      event.stopPropagation()
      items[(moves[event.key] + items.length) % items.length]?.focus()
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      event.preventDefault()
      event.stopPropagation()
      onClose()
    }
  }

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Choisir le shell"
      className="absolute top-full left-0 z-20 mt-1 min-w-[190px] rounded-md border border-dock-line bg-dock-panel p-1 shadow-lg"
      onKeyDown={handleKeyDown}
    >
      {shells.length === 0 && <span className="block px-3 py-2 text-xs text-dock-muted">Aucun shell disponible</span>}
      {shells.map((shell) => {
        const handleSelect = () => onSelect(shell.id)
        return (
          <button
            key={shell.id}
            type="button"
            role="menuitem"
            tabIndex={-1}
            className="block w-full cursor-pointer rounded px-3 py-2 text-left text-xs text-dock-ink hover:bg-dock-green-hover focus:bg-dock-green-soft focus:text-dock-green-deep focus:outline-none"
            onClick={handleSelect}
          >
            {shell.name}
          </button>
        )
      })}
    </div>
  )
}
