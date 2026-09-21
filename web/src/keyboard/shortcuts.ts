import { bridge } from '../bridge/bridge'
import { useHostStore } from '../store/hostStore'
import { SplitAxis } from '../model/session'
import { useSessionStore } from '../store/sessionStore'
import { activePane, activeTab, activeWorkspace, panesOf } from '../model/session'

const LEADER_TIMEOUT_MS = 5000
const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'AltGraph', 'Meta'])

let leaderTimer: ReturnType<typeof setTimeout> | undefined

const keyIs = (event: KeyboardEvent, letter: string): boolean =>
  event.key.toLowerCase() === letter || event.code === `Key${letter.toUpperCase()}`

const isLeaderChord = (event: KeyboardEvent): boolean =>
  event.ctrlKey && !event.altKey && !event.shiftKey && (event.key === ' ' || event.code === 'Space')

const isPalette = (event: KeyboardEvent): boolean => event.ctrlKey && !event.altKey && !event.shiftKey && keyIs(event, 'p')
const isCloseWindow = (event: KeyboardEvent): boolean => event.altKey && event.key === 'F4'
const isCopy = (event: KeyboardEvent): boolean => event.ctrlKey && event.shiftKey && keyIs(event, 'c')
const isPaste = (event: KeyboardEvent): boolean => event.ctrlKey && event.shiftKey && keyIs(event, 'v')

const exitLeader = (): void => {
  clearTimeout(leaderTimer)
  useHostStore.getState().setLeaderActive(false)
}

const enterLeader = (): void => {
  useHostStore.getState().setLeaderActive(true)
  clearTimeout(leaderTimer)
  leaderTimer = setTimeout(exitLeader, LEADER_TIMEOUT_MS)
}

const cyclePane = (offset: number): void => {
  const { session, selectPane } = useSessionStore.getState()
  if (!session) {
    return
  }
  const tab = activeTab(activeWorkspace(session))
  const panes = panesOf(tab.tree)
  const index = panes.findIndex((pane) => pane.id === tab.active)
  selectPane(panes[(index + offset + panes.length) % panes.length].id)
}

const leaderCommands: Record<string, () => void> = {
  o: () => cyclePane(1),
  ArrowRight: () => cyclePane(1),
  ArrowDown: () => cyclePane(1),
  ArrowLeft: () => cyclePane(-1),
  ArrowUp: () => cyclePane(-1),
  '%': () => useSessionStore.getState().splitPane(SplitAxis.Horizontal),
  d: () => useSessionStore.getState().splitPane(SplitAxis.Horizontal),
  s: () => useSessionStore.getState().splitPane(SplitAxis.Vertical),
  '"': () => useSessionStore.getState().splitPane(SplitAxis.Vertical),
  c: () => useSessionStore.getState().newTab(currentShell()),
  x: () => useSessionStore.getState().closePane(currentPaneId()),
  b: () => useSessionStore.getState().toggleSidebar(),
}

const currentShell = (): string => {
  const { session } = useSessionStore.getState()
  return session ? activePane(activeTab(activeWorkspace(session))).shell : 'powershell'
}

const currentPaneId = (): string => {
  const { session } = useSessionStore.getState()
  return session ? activeTab(activeWorkspace(session)).active : ''
}

const runLeaderCommand = (event: KeyboardEvent): void => {
  exitLeader()
  leaderCommands[event.key]?.()
}

export const isReservedShortcut = (event: KeyboardEvent): boolean =>
  isLeaderChord(event) || isPalette(event) || isCloseWindow(event) || isCopy(event) || isPaste(event)

export interface ShortcutActions {
  copySelection: () => void
  pasteClipboard: () => void
}

export const handleTerminalKey = (event: KeyboardEvent, actions: ShortcutActions): boolean => {
  const passToTerminal = decide(event, actions)
  if (!passToTerminal) {
    event.preventDefault()
    event.stopPropagation()
  }
  return passToTerminal
}

const decide = (event: KeyboardEvent, actions: ShortcutActions): boolean => {
  if (event.type !== 'keydown') {
    return !isReservedShortcut(event)
  }
  if (isCloseWindow(event)) {
    bridge.send({ type: 'window.close' })
    return false
  }
  if (useHostStore.getState().leaderActive) {
    if (!MODIFIER_KEYS.has(event.key)) {
      runLeaderCommand(event)
    }
    return false
  }
  if (isLeaderChord(event)) {
    enterLeader()
    return false
  }
  if (isPalette(event)) {
    useHostStore.getState().setStatus('Palette Ctrl + P : à venir (F12).')
    return false
  }
  if (isCopy(event)) {
    actions.copySelection()
    return false
  }
  if (isPaste(event)) {
    actions.pasteClipboard()
    return false
  }
  return true
}
