import { StatusLevel, useHostStore } from '../store/hostStore'

const STATUS_CLASSES: Record<StatusLevel, string> = {
  [StatusLevel.Info]: 'text-dock-muted',
  [StatusLevel.Warning]: 'text-dock-warning',
  [StatusLevel.Error]: 'text-dock-error',
}

export function StatusBar() {
  const status = useHostStore((state) => state.status)
  const unsaved = useHostStore((state) => state.unsaved)

  return (
    <footer className={`flex h-[24px] shrink-0 items-center border-t border-dock-line bg-dock-paper px-3 font-mono text-[11px] ${STATUS_CLASSES[status.level]}`}>
      <span className="truncate">{status.text}</span>
      {unsaved && (
        <span className="ml-auto shrink-0 pl-3 text-dock-error" data-tip="La dernière sauvegarde a échoué : la session restera en l’état d’avant tant qu’une écriture ne réussit pas.">
          Non enregistré
        </span>
      )}
    </footer>
  )
}
