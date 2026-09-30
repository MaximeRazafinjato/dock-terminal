import { bridge } from '../bridge/bridge'
import { activeTab, activeWorkspace, DEFAULT_SHELL, folderName } from '../model/session'
import { useHostStore } from '../store/hostStore'
import { useSessionStore } from '../store/sessionStore'
import { focusPane, joinPane } from '../terminal/terminalActions'
import { terminalRegistry } from '../terminal/terminalRegistry'

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

let nextRequest = 0

export const resumeSession = (sessionId: string, paneId?: string): void => {
  nextRequest += 1
  bridge.send({ type: 'agent.prepareResume', request: nextRequest, sessionId, pane: paneId })
}

const openResumeTab = (directory: string): string | undefined => {
  const store = useSessionStore.getState()
  const session = store.session
  if (session && activeWorkspace(session)) {
    store.newTabAt(directory, DEFAULT_SHELL)
  } else {
    store.newWorkspace(folderName(directory), directory, DEFAULT_SHELL)
  }
  const current = useSessionStore.getState().session
  const workspace = current ? activeWorkspace(current) : undefined
  return workspace ? activeTab(workspace).active : undefined
}

export const receiveResumePrepared = (directory: string, command: string, paneId: string | undefined): void => {
  const terminal = paneId ? terminalRegistry.get(paneId)?.terminal : undefined
  if (paneId && terminal) {
    joinPane(paneId)
    terminal.input(`${command}\r`, true)
    useHostStore.getState().setStatus('Reprise de la session Claude Code dans ce terminal.')
    return
  }
  const opened = openResumeTab(directory)
  if (opened) {
    terminalRegistry.runAtStart(opened, command)
    requestAnimationFrame(() => requestAnimationFrame(() => focusPane(opened)))
  }
  useHostStore.getState().setStatus(`Reprise de la session Claude Code dans ${folderName(directory)}.`)
}

export const endedLabel = (endedAt: number | undefined, now: number): string => {
  if (endedAt === undefined) {
    return 'en cours'
  }
  const elapsed = now - endedAt
  if (elapsed < MINUTE_MS) {
    return 'à l’instant'
  }
  if (elapsed < HOUR_MS) {
    return `il y a ${Math.floor(elapsed / MINUTE_MS)} min`
  }
  if (elapsed < DAY_MS) {
    return `il y a ${Math.floor(elapsed / HOUR_MS)} h`
  }
  return new Date(endedAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}
