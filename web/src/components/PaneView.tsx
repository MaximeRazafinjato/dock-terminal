import type { ShellProfile } from '../bridge/messages'
import { SplitAxis, type Pane } from '../model/session'
import { usePaneStore } from '../store/paneStore'
import { TerminalPane } from '../terminal/TerminalPane'
import { PaneOverlay } from './PaneOverlay'

interface PaneViewProps {
  pane: Pane
  active: boolean
  onFocus: (paneId: string) => void
  onClose: (paneId: string) => void
  onSplit: (paneId: string, axis: SplitAxis) => void
  shells: ShellProfile[]
  onRestart: (paneId: string) => void
  onChangeShell: (paneId: string, shellId: string) => void
}

const HEADER_BUTTON = 'flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded hover:bg-dock-green-hover hover:text-dock-ink'
const ICON_SIZE = 12

const SplitIcon = ({ horizontal }: { horizontal: boolean }) => (
  <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
    <rect x="1.5" y="1.5" width="9" height="9" rx="1.5" />
    {horizontal ? <line x1="6" y1="1.5" x2="6" y2="10.5" /> : <line x1="1.5" y1="6" x2="10.5" y2="6" />}
  </svg>
)

const CloseIcon = () => (
  <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" aria-hidden="true">
    <line x1="3" y1="3" x2="9" y2="9" />
    <line x1="9" y1="3" x2="3" y2="9" />
  </svg>
)

export function PaneView({ pane, active, onFocus, onClose, onSplit, shells, onRestart, onChangeShell }: PaneViewProps) {
  const paneState = usePaneStore((state) => state.states[pane.id])
  const handleHeaderMouseDown = () => onFocus(pane.id)
  const handleRestart = () => onRestart(pane.id)
  const handleChangeShell = (shellId: string) => onChangeShell(pane.id, shellId)
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
          <SplitIcon horizontal />
        </button>
        <button type="button" className={HEADER_BUTTON} title="Split haut / bas" aria-label="Split haut / bas" onClick={handleSplitTopBottom}>
          <SplitIcon horizontal={false} />
        </button>
        <button type="button" className={`${HEADER_BUTTON} hover:text-dock-error`} title="Fermer le pane" aria-label="Fermer le pane" onClick={handleClose}>
          <CloseIcon />
        </button>
      </header>
      <div className="relative min-h-0">
        <TerminalPane pane={pane} active={active} onFocus={onFocus} />
        {paneState && <PaneOverlay state={paneState} shells={shells} onRestart={handleRestart} onChangeShell={handleChangeShell} onClose={handleClose} />}
      </div>
    </section>
  )
}
