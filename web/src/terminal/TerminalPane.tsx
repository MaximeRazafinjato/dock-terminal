import { useEffect, useRef } from 'react'
import type { Pane } from '../model/session'
import { handleTerminalKey } from '../keyboard/shortcuts'
import { useUiStore } from '../store/uiStore'
import { terminalRegistry } from './terminalRegistry'

interface TerminalPaneProps {
  pane: Pane
  active: boolean
  onFocus: (paneId: string) => void
}

export function TerminalPane({ pane, active, onFocus }: TerminalPaneProps) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) {
      return
    }
    const handle = terminalRegistry.attach(pane, host)
    handle.keyHandler = (event) =>
      handleTerminalKey(event, {
        hasSelection: () => handle.terminal.hasSelection(),
        copySelection: () => {
          if (handle.terminal.hasSelection()) {
            void navigator.clipboard.writeText(handle.terminal.getSelection())
            handle.terminal.clearSelection()
          }
        },
        pasteClipboard: () => {
          void navigator.clipboard.readText().then((text) => handle.terminal.paste(text))
        },
      })
    const observer = new ResizeObserver(() => handle.fit.fit())
    observer.observe(host)
    return () => observer.disconnect()
  }, [pane])

  useEffect(() => {
    const { renamingWorkspaceId, renamingTabId, paletteOpen, projectPickerOpen, settingsOpen, closeConfirmation } = useUiStore.getState()
    if (active && !renamingWorkspaceId && !renamingTabId && !paletteOpen && !projectPickerOpen && !settingsOpen && !closeConfirmation) {
      terminalRegistry.get(pane.id)?.terminal.focus()
    }
  }, [active, pane.id])

  const handleMouseDown = () => onFocus(pane.id)

  return <div ref={hostRef} className="h-full min-h-0 p-1" onMouseDown={handleMouseDown} />
}
