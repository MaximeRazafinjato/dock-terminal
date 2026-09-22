import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { ShellProfile } from '../bridge/messages'
import type { Session } from '../model/session'
import { buildPaletteItems, filterPaletteItems, type PaletteItem } from '../palette/paletteItems'

interface CommandPaletteProps {
  session: Session
  shells: ShellProfile[]
  onClose: () => void
  onRun: (item: PaletteItem) => void
}

const RESULT_ID_PREFIX = 'palette-result-'
const LISTBOX_ID = 'palette-results'

export function CommandPalette({ session, shells, onClose, onRun }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const items = useMemo(() => buildPaletteItems(session, shells), [session, shells])
  const filtered = useMemo(() => filterPaletteItems(items, query), [items, query])
  const selectedItem = filtered[selected]

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`#${RESULT_ID_PREFIX}${selected}`)?.scrollIntoView({ block: 'nearest' })
  }, [selected, filtered])

  const move = (offset: number) => {
    if (filtered.length > 0) {
      setSelected((current) => (current + offset + filtered.length) % filtered.length)
    }
  }
  const handleQueryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value)
    setSelected(0)
  }
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) {
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      move(event.key === 'ArrowDown' ? 1 : -1)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (selectedItem) {
        onRun(selectedItem)
      }
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }
  const handleBackdropPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }
  const handleResultPointerDown = (event: PointerEvent<HTMLButtonElement>) => event.preventDefault()

  return (
    <div className="absolute inset-0 z-30 flex items-start justify-center bg-dock-paper/60 pt-[12vh]" onPointerDown={handleBackdropPointerDown}>
      <div role="dialog" aria-label="Commandes et navigation" className="flex max-h-[70vh] w-[560px] max-w-[92vw] flex-col rounded-lg border border-dock-line bg-dock-panel p-2 shadow-xl">
        <input
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded="true"
          aria-controls={LISTBOX_ID}
          aria-activedescendant={selectedItem ? `${RESULT_ID_PREFIX}${selected}` : undefined}
          autoFocus
          placeholder="Commande, workspace, onglet ou pane…"
          value={query}
          className="rounded border border-dock-focus bg-dock-paper px-3 py-2 text-[13px] text-dock-ink outline-none placeholder:text-dock-muted"
          onChange={handleQueryChange}
          onKeyDown={handleKeyDown}
        />
        <div ref={listRef} id={LISTBOX_ID} role="listbox" aria-label="Résultats" className="mt-2 min-h-0 flex-1 overflow-y-auto">
          {filtered.length === 0 && <p className="px-3 py-2 text-xs text-dock-muted">Aucun résultat.</p>}
          {filtered.map((item, index) => {
            const handleHover = () => setSelected(index)
            const handleClick = () => onRun(item)
            const isSelected = index === selected
            return (
              <button
                key={item.id}
                id={`${RESULT_ID_PREFIX}${index}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                tabIndex={-1}
                className={`flex w-full cursor-pointer items-baseline gap-3 rounded px-3 py-2 text-left text-[13px] focus:outline-none ${isSelected ? 'bg-dock-green-soft text-dock-green-deep' : 'text-dock-ink'}`}
                onPointerMove={handleHover}
                onPointerDown={handleResultPointerDown}
                onClick={handleClick}
              >
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.hint && <span className="shrink-0 truncate font-mono text-[11px] text-dock-muted">{item.hint}</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
