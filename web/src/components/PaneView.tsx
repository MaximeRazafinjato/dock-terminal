import { SplitAxis, type Pane } from '../model/session'
import { TerminalPane } from '../terminal/TerminalPane'

interface PaneViewProps {
  pane: Pane
  active: boolean
  onFocus: (paneId: string) => void
  onClose: (paneId: string) => void
  onSplit: (paneId: string, axis: SplitAxis) => void
}

const HEADER_BUTTON = 'cursor-pointer rounded px-1 hover:bg-dock-green-hover hover:text-dock-ink'

export function PaneView({ pane, active, onFocus, onClose, onSplit }: PaneViewProps) {
  const handleHeaderMouseDown = () => onFocus(pane.id)
  const handleSplitSideBySide = () => onSplit(pane.id, SplitAxis.Horizontal)
  const handleSplitTopBottom = () => onSplit(pane.id, SplitAxis.Vertical)
  const handleClose = () => onClose(pane.id)

  return (
    <section
      data-pane-id={pane.id}
      className={`grid h-full min-h-0 grid-rows-[24px_1fr] overflow-hidden rounded-md border bg-dock-terminal ${active ? 'border-dock-green' : 'border-dock-line'}`}
    >
      <header
        className="flex items-center gap-2 bg-dock-panel px-2 text-[11px] text-dock-muted select-none"
        onMouseDown={handleHeaderMouseDown}
      >
        <span className="font-semibold text-dock-ink">{pane.shell}</span>
        <span className="min-w-0 flex-1 truncate font-mono text-dock-green" title={pane.path}>
          {pane.path}
        </span>
        <button type="button" className={HEADER_BUTTON} title="Split côte à côte" aria-label="Split côte à côte" onClick={handleSplitSideBySide}>
          ◫
        </button>
        <button type="button" className={HEADER_BUTTON} title="Split haut / bas" aria-label="Split haut / bas" onClick={handleSplitTopBottom}>
          ⊟
        </button>
        <button type="button" className={`${HEADER_BUTTON} hover:text-dock-error`} title="Fermer le pane" aria-label="Fermer le pane" onClick={handleClose}>
          ×
        </button>
      </header>
      <TerminalPane pane={pane} active={active} onFocus={onFocus} />
    </section>
  )
}
