import { bridge } from '../bridge/bridge'
import { allPanes, type Session } from '../model/session'
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
  saveTextNow()
  bridge.send({ type: 'window.close' })
}
