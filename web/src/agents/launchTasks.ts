import type { Terminal } from '@xterm/xterm'
import { AgentState } from '../bridge/messages'
import { useAgentStore } from '../store/agentStore'
import { StatusLevel, useHostStore } from '../store/hostStore'
import { terminalRegistry } from '../terminal/terminalRegistry'

const POLL_MS = 100
const READY_DELAY_MS = 500
const BRACKETED_PASTE_WAIT_MS = 15_000
const SUBMIT_DELAY_MS = 300
const SUBMIT_CHECK_MS = 2500
const START_TIMEOUT_MS = 180_000
const FOCUS_IN_REPORT = '\u001b[I'

interface PendingTask {
  sessionId: string
  task: string
  since: number
}

const pendingTasks = new Map<string, PendingTask>()
let worktreeTask: string | null = null

const setStatus = (text: string, level?: StatusLevel): void => useHostStore.getState().setStatus(text, level)

const submitted = (paneId: string, before: AgentState | undefined): boolean => {
  const state = useAgentStore.getState().agents[paneId]?.state
  return state !== undefined && (state !== before || state === AgentState.Working)
}

export const pasteAndSubmit = (paneId: string, terminal: Terminal, text: string): void => {
  const before = useAgentStore.getState().agents[paneId]?.state
  terminal.paste(text)
  setTimeout(() => {
    terminal.input('\r', true)
    setTimeout(() => {
      if (!submitted(paneId, before)) {
        terminal.input(FOCUS_IN_REPORT, false)
        terminal.input('\r', true)
      }
    }, SUBMIT_CHECK_MS)
  }, SUBMIT_DELAY_MS)
}

const deliverTask = (paneId: string, task: string, waited: number): void => {
  const terminal = terminalRegistry.get(paneId)?.terminal
  if (!terminal) {
    setStatus('Terminal de l’agent introuvable : tâche non envoyée.', StatusLevel.Error)
    return
  }
  if (!terminal.modes.bracketedPasteMode) {
    if (waited >= BRACKETED_PASTE_WAIT_MS) {
      setStatus('Claude Code n’a pas activé le collage délimité : tâche non envoyée.', StatusLevel.Error)
      return
    }
    setTimeout(() => deliverTask(paneId, task, waited + POLL_MS), POLL_MS)
    return
  }
  pasteAndSubmit(paneId, terminal, task)
  setStatus('Tâche envoyée à Claude Code.')
}

export const registerLaunchTask = (paneId: string, sessionId: string, task: string): void => {
  pendingTasks.set(paneId, { sessionId, task, since: Date.now() })
}

export const rememberWorktreeTask = (task: string | null): void => {
  worktreeTask = task
}

export const takeWorktreeTask = (): string | null => {
  const task = worktreeTask
  worktreeTask = null
  return task
}

export const startLaunchTaskWatcher = (): (() => void) =>
  useAgentStore.subscribe((state) => {
    for (const [paneId, pending] of pendingTasks) {
      if (state.agents[paneId]?.sessionId === pending.sessionId) {
        pendingTasks.delete(paneId)
        setTimeout(() => deliverTask(paneId, pending.task, 0), READY_DELAY_MS)
      } else if (Date.now() - pending.since > START_TIMEOUT_MS) {
        pendingTasks.delete(paneId)
        setStatus('Claude Code n’a pas démarré à temps : la tâche n’a pas été envoyée.', StatusLevel.Warning)
      }
    }
  })
