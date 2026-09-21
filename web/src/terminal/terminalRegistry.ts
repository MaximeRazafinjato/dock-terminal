import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'
import { CanvasAddon } from '@xterm/addon-canvas'
import { Unicode11Addon } from '@xterm/addon-unicode11'
import { ClipboardAddon } from '@xterm/addon-clipboard'
import { bridge } from '../bridge/bridge'
import type { Pane } from '../model/session'

const ACK_THRESHOLD = 256 * 1024
const FONT_FAMILY = '"CaskaydiaCove Nerd Font Mono", "Cascadia Mono", "Cascadia Code", Consolas, "Symbols Nerd Font Mono", monospace'

export enum Renderer {
  WebGl = 'webgl',
  Canvas = 'canvas',
  Dom = 'dom',
}

export interface TerminalHandle {
  paneId: string
  terminal: Terminal
  fit: FitAddon
  renderer: Renderer
  started: boolean
  unackedChars: number
  keyHandler?: (event: KeyboardEvent) => boolean
}

const handles = new Map<string, TerminalHandle>()

const loadCanvas = (terminal: Terminal): Renderer => {
  try {
    terminal.loadAddon(new CanvasAddon())
    return Renderer.Canvas
  } catch {
    return Renderer.Dom
  }
}

const selectRenderer = (handle: TerminalHandle): Renderer => {
  try {
    const webgl = new WebglAddon()
    webgl.onContextLoss(() => {
      webgl.dispose()
      handle.renderer = loadCanvas(handle.terminal)
    })
    handle.terminal.loadAddon(webgl)
    return Renderer.WebGl
  } catch {
    return loadCanvas(handle.terminal)
  }
}

const createHandle = (pane: Pane): TerminalHandle => {
  const terminal = new Terminal({
    allowProposedApi: true,
    cursorBlink: true,
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    scrollback: 10000,
    theme: { background: '#0b0f0d', foreground: '#d7dfda', cursor: '#4fb37a', selectionBackground: '#4fb37a55' },
  })
  const fit = new FitAddon()
  terminal.loadAddon(fit)
  terminal.loadAddon(new Unicode11Addon())
  terminal.loadAddon(new ClipboardAddon())
  terminal.unicode.activeVersion = '11'
  const handle: TerminalHandle = { paneId: pane.id, terminal, fit, renderer: Renderer.Dom, started: false, unackedChars: 0 }
  terminal.onData((data) => bridge.send({ type: 'terminal.input', pane: pane.id, data }))
  terminal.onResize(({ cols, rows }) => {
    if (handle.started) {
      bridge.send({ type: 'terminal.resize', pane: pane.id, cols, rows })
    }
  })
  terminal.attachCustomKeyEventHandler((event) => handle.keyHandler?.(event) ?? true)
  return handle
}

export const terminalRegistry = {
  get(paneId: string): TerminalHandle | undefined {
    return handles.get(paneId)
  },

  attach(pane: Pane, element: HTMLElement): TerminalHandle {
    let handle = handles.get(pane.id)
    if (!handle) {
      handle = createHandle(pane)
      handles.set(pane.id, handle)
    }
    if (!handle.terminal.element) {
      handle.terminal.open(element)
      handle.renderer = selectRenderer(handle)
    } else if (handle.terminal.element.parentElement !== element) {
      element.appendChild(handle.terminal.element)
    }
    handle.fit.fit()
    if (!handle.started) {
      handle.started = true
      bridge.send({ type: 'terminal.create', pane: pane.id, shell: pane.shell, cwd: pane.path, cols: handle.terminal.cols, rows: handle.terminal.rows })
    }
    return handle
  },

  write(paneId: string, data: string): void {
    const handle = handles.get(paneId)
    if (!handle) {
      return
    }
    handle.unackedChars += data.length
    handle.terminal.write(data, () => {
      if (handle.unackedChars >= ACK_THRESHOLD) {
        bridge.send({ type: 'terminal.ack', pane: paneId, chars: handle.unackedChars })
        handle.unackedChars = 0
      }
    })
  },

  markExited(paneId: string, code: number): void {
    handles.get(paneId)?.terminal.write(`\r\n\x1b[31m[processus terminé, code ${code}]\x1b[0m\r\n`)
  },

  dispose(paneId: string): void {
    const handle = handles.get(paneId)
    if (!handle) {
      return
    }
    bridge.send({ type: 'terminal.close', pane: paneId })
    handle.terminal.dispose()
    handles.delete(paneId)
  },

  disposeMissing(livePaneIds: Set<string>): void {
    for (const paneId of [...handles.keys()]) {
      if (!livePaneIds.has(paneId)) {
        terminalRegistry.dispose(paneId)
      }
    }
  },
}
