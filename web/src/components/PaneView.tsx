import type { Pane } from '../model/session'
import { TerminalPane } from '../terminal/TerminalPane'

interface PaneViewProps {
  pane: Pane
  active: boolean
  onFocus: (paneId: string) => void
  onClose: (paneId: string) => void
}

export function PaneView({ pane, active, onFocus, onClose }: PaneViewProps) {
  const handleHeaderMouseDown = () => onFocus(pane.id)
  const handleClose = () => onClose(pane.id)

  return (
    <section
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
        <button type="button" className="rounded px-1 hover:bg-dock-green-hover" title="Fermer le pane" onClick={handleClose}>
          ×
        </button>
      </header>
      <TerminalPane pane={pane} active={active} onFocus={onFocus} />
    </section>
  )
}
