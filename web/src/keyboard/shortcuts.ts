import { bridge } from '../bridge/bridge'
import { useHostStore } from '../store/hostStore'
import { activePane, activeTab, activeWorkspace, DEFAULT_SHELL, panesOf, SplitAxis, type Workspace } from '../model/session'
import { useSessionStore } from '../store/sessionStore'
import { closePaneKeepingText, restoreClosedTab } from '../terminal/tabLifecycle'
import { RenameOrigin, useUiStore } from '../store/uiStore'

const LEADER_TIMEOUT_MS = 5000
const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'AltGraph', 'Meta'])

export enum Command {
  Palette = 'palette',
  NewTab = 'newTab',
  SplitSideBySide = 'splitSideBySide',
  SplitTopBottom = 'splitTopBottom',
  NewWorkspace = 'newWorkspace',
  ClosePane = 'closePane',
  NextPane = 'nextPane',
  PreviousPane = 'previousPane',
  MoveTabLeft = 'moveTabLeft',
  MoveTabRight = 'moveTabRight',
  RestoreTab = 'restoreTab',
}

const LEADER_KEYS: Record<string, Command> = {
  p: Command.Palette,
  t: Command.NewTab,
  v: Command.SplitSideBySide,
  h: Command.SplitTopBottom,
  w: Command.NewWorkspace,
  x: Command.ClosePane,
  z: Command.RestoreTab,
  ArrowRight: Command.NextPane,
  ArrowDown: Command.NextPane,
  ArrowLeft: Command.PreviousPane,
  ArrowUp: Command.PreviousPane,
  PageUp: Command.MoveTabLeft,
  PageDown: Command.MoveTabRight,
}

const DIRECT_PAGE_KEYS: Record<string, Command> = {
  PageUp: Command.MoveTabLeft,
  PageDown: Command.MoveTabRight,
}

const DIRECT_LETTER_KEYS: Record<string, Command> = {
  p: Command.Palette,
  t: Command.NewTab,
  d: Command.SplitSideBySide,
  h: Command.SplitTopBottom,
  w: Command.NewWorkspace,
  x: Command.ClosePane,
  z: Command.RestoreTab,
}

const DIRECT_ARROW_KEYS: Record<string, Command> = {
  ArrowRight: Command.NextPane,
  ArrowDown: Command.NextPane,
  ArrowLeft: Command.PreviousPane,
  ArrowUp: Command.PreviousPane,
}

let leaderTimer: ReturnType<typeof setTimeout> | undefined

const letterOf = (event: KeyboardEvent): string => {
  if (/^[a-zA-Z]$/.test(event.key)) {
    return event.key.toLowerCase()
  }
  const fromCode = /^Key([A-Z])$/.exec(event.code)
  return fromCode ? fromCode[1].toLowerCase() : event.key.toLowerCase()
}

const isLeaderChord = (event: KeyboardEvent): boolean =>
  event.ctrlKey && !event.altKey && !event.shiftKey && (event.key === ' ' || event.code === 'Space')

const isCloseWindow = (event: KeyboardEvent): boolean => event.altKey && event.key === 'F4'
const isCopy = (event: KeyboardEvent): boolean => event.ctrlKey && event.shiftKey && !event.altKey && letterOf(event) === 'c'
const isPaste = (event: KeyboardEvent): boolean => event.ctrlKey && event.shiftKey && !event.altKey && letterOf(event) === 'v'

const directCommand = (event: KeyboardEvent): Command | undefined => {
  if (event.ctrlKey && !event.altKey && letterOf(event) === 'p') {
    return Command.Palette
  }
  if (event.ctrlKey && event.shiftKey && !event.altKey) {
    return DIRECT_PAGE_KEYS[event.key] ?? DIRECT_LETTER_KEYS[letterOf(event)]
  }
  if (event.altKey && !event.ctrlKey && !event.shiftKey) {
    return DIRECT_ARROW_KEYS[event.key]
  }
  return undefined
}

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
  const workspace = session ? activeWorkspace(session) : undefined
  if (!workspace) {
    return
  }
  const tab = activeTab(workspace)
  const panes = panesOf(tab.tree)
  const index = panes.findIndex((pane) => pane.id === tab.active)
  selectPane(panes[(index + offset + panes.length) % panes.length].id)
}

const currentWorkspace = (): Workspace | undefined => {
  const { session } = useSessionStore.getState()
  return session ? activeWorkspace(session) : undefined
}

const currentShell = (): string => {
  const workspace = currentWorkspace()
  return workspace ? activePane(activeTab(workspace)).shell : DEFAULT_SHELL
}

const currentPaneId = (): string => currentWorkspace()?.active ?? ''

export const runCommand = (command: Command): void => {
  const sessionStore = useSessionStore.getState()
  const hostStore = useHostStore.getState()
  switch (command) {
    case Command.Palette:
      hostStore.setStatus('Palette Ctrl + P : à venir (F12).')
      break
    case Command.NewTab:
      sessionStore.newTab(currentShell())
      break
    case Command.SplitSideBySide:
      sessionStore.splitPane(SplitAxis.Horizontal)
      break
    case Command.SplitTopBottom:
      sessionStore.splitPane(SplitAxis.Vertical)
      break
    case Command.NewWorkspace:
      useUiStore.getState().startRenamingWorkspace(sessionStore.newWorkspace(`Workspace ${(sessionStore.session?.workspaces.length ?? 0) + 1}`, hostStore.home, DEFAULT_SHELL), RenameOrigin.Header)
      break
    case Command.ClosePane:
      closePaneKeepingText(currentPaneId())
      break
    case Command.NextPane:
      cyclePane(1)
      break
    case Command.PreviousPane:
      cyclePane(-1)
      break
    case Command.MoveTabLeft:
      sessionStore.moveActiveTab(-1)
      break
    case Command.MoveTabRight:
      sessionStore.moveActiveTab(1)
      break
    case Command.RestoreTab:
      restoreClosedTab()
      break
  }
}

export const isReservedShortcut = (event: KeyboardEvent): boolean =>
  isLeaderChord(event) || isCloseWindow(event) || isCopy(event) || isPaste(event) || directCommand(event) !== undefined

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
      exitLeader()
      const command = LEADER_KEYS[event.key.length === 1 ? event.key.toLowerCase() : event.key]
      if (command) {
        runCommand(command)
      }
    }
    return false
  }
  if (isLeaderChord(event)) {
    enterLeader()
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
  const command = directCommand(event)
  if (command) {
    runCommand(command)
    return false
  }
  return true
}
