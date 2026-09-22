import { useEffect } from 'react'
import { bridge } from './bridge/bridge'
import { AppShell } from './components/AppShell'
import { allPanes } from './model/session'
import { StatusLevel, useHostStore } from './store/hostStore'
import { usePaneStore } from './store/paneStore'
import { useSessionStore } from './store/sessionStore'
import { terminalRegistry } from './terminal/terminalRegistry'

const SAVE_DEBOUNCE_MS = 500

export default function App() {
  const session = useSessionStore((state) => state.session)
  const connected = useHostStore((state) => state.connected)
  const status = useHostStore((state) => state.status)

  useEffect(() => {
    const { load, setPanePath } = useSessionStore.getState()
    const { setHello, setStatus } = useHostStore.getState()
    const { markFailed, markExited } = usePaneStore.getState()
    const subscriptions = [
      bridge.on('app.hello', (message) => {
        setHello(message.shells, message.home)
        void document.fonts.load('14px "Symbols Nerd Font Mono"').then(() => {
          load(message.session)
          setStatus('Session restaurée.')
        })
      }),
      bridge.on('terminal.output', (message) => terminalRegistry.write(message.pane, message.data)),
      bridge.on('terminal.cwd', (message) => setPanePath(message.pane, message.path)),
      bridge.on('terminal.exit', (message) => {
        terminalRegistry.markExited(message.pane, message.code)
        markExited(message.pane, message.code)
      }),
      bridge.on('error', (message) => {
        setStatus(message.message, StatusLevel.Error)
        if (message.pane) {
          markFailed(message.pane, message.message)
        }
      }),
    ]
    if (bridge.available) {
      bridge.send({ type: 'app.ready' })
    } else {
      setStatus('Cette page doit être ouverte dans l’hôte Dock : aucun pont détecté.', StatusLevel.Error)
    }
    return () => subscriptions.forEach((unsubscribe) => unsubscribe())
  }, [])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    return useSessionStore.subscribe((state, previous) => {
      if (!state.session || state.session === previous.session) {
        return
      }
      terminalRegistry.disposeMissing(new Set(allPanes(state.session).map((pane) => pane.id)))
      clearTimeout(timer)
      timer = setTimeout(() => bridge.send({ type: 'session.save', session: state.session! }), SAVE_DEBOUNCE_MS)
    })
  }, [])

  if (!session || !connected) {
    return <div className="flex h-full items-center justify-center text-dock-muted">{status.text}</div>
  }

  return <AppShell session={session} />
}
