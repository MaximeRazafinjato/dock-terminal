import { bridge } from '../bridge/bridge'
import { allPanes, type Session } from '../model/session'
import { useSessionStore } from '../store/sessionStore'
import { RestoreKind, terminalRegistry } from './terminalRegistry'

export const primeSessionText = (session: Session, text: Record<string, string>): void => {
  for (const pane of allPanes(session)) {
    const content = text[pane.id]
    if (content) {
      terminalRegistry.prime(pane.id, content, RestoreKind.Session)
    }
  }
}

export const saveTextNow = (): void => {
  bridge.send({ type: 'text.save', text: terminalRegistry.snapshotLive() })
}

export const startTextAutosave = (intervalSeconds: number): (() => void) => {
  const timer = setInterval(saveTextNow, intervalSeconds * 1000)
  return () => clearInterval(timer)
}

export const closeApplication = (): void => {
  const { session } = useSessionStore.getState()
  if (session) {
    bridge.send({ type: 'session.save', session })
  }
  saveTextNow()
  bridge.send({ type: 'window.close' })
}
