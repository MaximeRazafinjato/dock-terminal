import { useEffect } from 'react'
import { bridge } from './bridge/bridge'
import { AppShell } from './components/AppShell'
import { allPanes } from './model/session'
import { StatusLevel, useHostStore } from './store/hostStore'
import { usePaneStore } from './store/paneStore'
import { useSessionStore } from './store/sessionStore'
import { useUiStore } from './store/uiStore'
import { receiveContext } from './terminal/contextActions'
import { terminalRegistry } from './terminal/terminalRegistry'
import { closeApplication, primeSessionText, saveTextNow, startTextAutosave } from './terminal/textPersistence'

const SAVE_DEBOUNCE_MS = 500

export default function App() {
  const session = useSessionStore((state) => state.session)
  const connected = useHostStore((state) => state.connected)
  const status = useHostStore((state) => state.status)

  useEffect(() => {
    const { load, setPanePath } = useSessionStore.getState()
    const { setHello, setStatus, setProjects, setUnsaved, applySettings, setPickedPath } = useHostStore.getState()
    let stopAutosave: (() => void) | undefined
    const { markFailed, markExited, markPathMissing, clear } = usePaneStore.getState()
    const subscriptions = [
      bridge.on('app.hello', (message) => {
        setHello(message.shells, message.home, message.persistence)
        terminalRegistry.configure(message.persistence.linesPerPane)
        primeSessionText(message.session, message.text)
        void document.fonts.load('14px "Symbols Nerd Font Mono"').then(() => {
          load(message.session)
          stopAutosave?.()
          stopAutosave = startTextAutosave(message.persistence.textIntervalSeconds)
          if (message.recovery) {
            setStatus(message.recovery, StatusLevel.Warning)
          } else {
            setStatus('Session restaurée : nouveaux shells, aucune commande rejouée.')
          }
        })
      }),
      bridge.on('settings.result', (message) => {
        applySettings({ settings: message.settings, shellSettings: message.shellSettings, files: message.files, warnings: message.warnings }, message.shells, message.persistence)
        if (!message.saved) {
          return
        }
        terminalRegistry.configure(message.persistence.linesPerPane)
        stopAutosave?.()
        stopAutosave = startTextAutosave(message.persistence.textIntervalSeconds)
        useUiStore.getState().closeSettings()
        const warnings = message.warnings.join(' ')
        setStatus(warnings.length > 0 ? `Réglages enregistrés. ${warnings}` : 'Réglages enregistrés et appliqués.', warnings.length > 0 ? StatusLevel.Warning : StatusLevel.Info)
      }),
      bridge.on('dialog.picked', (message) => setPickedPath({ field: message.field, path: message.path })),
      bridge.on('app.closing', closeApplication),
      bridge.on('session.saved', () => setUnsaved(false)),
      bridge.on('session.saveFailed', (message) => {
        setUnsaved(true)
        setStatus(`${message.message} Les changements ne sont pas enregistrés.`, StatusLevel.Error)
      }),
      bridge.on('terminal.output', (message) => terminalRegistry.write(message.pane, message.data)),
      bridge.on('terminal.cwd', (message) => {
        setPanePath(message.pane, message.path)
        clear(message.pane)
      }),
      bridge.on('terminal.pathMissing', (message) => markPathMissing(message.pane, message.path, message.fallback)),
      bridge.on('projects.listed', (message) => setProjects(message.root, message.projects, message.error ?? null)),
      bridge.on('context.result', (message) => receiveContext(message.pane, message.path, message.git)),
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
    return () => {
      stopAutosave?.()
      subscriptions.forEach((unsubscribe) => unsubscribe())
    }
  }, [])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    return useSessionStore.subscribe((state, previous) => {
      if (!state.session || state.session === previous.session) {
        return
      }
      const removed = terminalRegistry.disposeMissing(new Set(allPanes(state.session).map((pane) => pane.id)))
      clearTimeout(timer)
      timer = setTimeout(() => {
        bridge.send({ type: 'session.save', session: state.session! })
        if (removed) {
          saveTextNow()
        }
      }, SAVE_DEBOUNCE_MS)
    })
  }, [])

  if (!session || !connected) {
    return <div className="flex h-full items-center justify-center text-dock-muted">{status.text}</div>
  }

  return <AppShell session={session} />
}
