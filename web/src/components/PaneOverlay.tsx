import { useCallback, useState } from 'react'
import type { ShellProfile } from '../bridge/messages'
import { PaneStateKind, type PaneState } from '../store/paneStore'
import { ShellMenu } from './ShellMenu'

interface PaneOverlayProps {
  state: PaneState
  shells: ShellProfile[]
  onRestart: () => void
  onChangeShell: (shellId: string) => void
  onClose: () => void
}

const TITLES: Record<PaneStateKind, string> = {
  [PaneStateKind.Failed]: 'Le shell n’a pas pu démarrer.',
  [PaneStateKind.Exited]: 'Le shell est terminé.',
}

const BUTTON = 'cursor-pointer rounded border px-3 py-1.5 text-[12px]'

export function PaneOverlay({ state, shells, onRestart, onChangeShell, onClose }: PaneOverlayProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const handleOpenMenu = () => setMenuOpen(true)
  const handleCloseMenu = useCallback(() => setMenuOpen(false), [])
  const handleSelectShell = (shellId: string) => {
    setMenuOpen(false)
    onChangeShell(shellId)
  }

  return (
    <div role="alert" className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-dock-terminal/90 p-4 text-center">
      <p className="text-[13px] font-semibold text-dock-ink">{TITLES[state.kind]}</p>
      <p className="max-w-full font-mono text-[11px] break-words text-dock-muted">{state.message}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button type="button" className={`${BUTTON} border-dock-green text-dock-green-deep hover:bg-dock-green-soft`} onClick={onRestart}>
          Relancer
        </button>
        <div className="relative">
          <button type="button" className={`${BUTTON} border-dock-line text-dock-ink hover:bg-dock-green-hover`} aria-haspopup="menu" aria-expanded={menuOpen} onClick={handleOpenMenu}>
            Choisir un shell
          </button>
          {menuOpen && <ShellMenu shells={shells} onSelect={handleSelectShell} onClose={handleCloseMenu} />}
        </div>
        <button type="button" className={`${BUTTON} border-dock-line text-dock-muted hover:text-dock-error`} onClick={onClose}>
          Fermer le pane
        </button>
      </div>
    </div>
  )
}
