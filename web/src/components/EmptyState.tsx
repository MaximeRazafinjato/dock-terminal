interface EmptyStateProps {
  canRestore: boolean
  onNewWorkspace: () => void
  onRestoreTab: () => void
}

export function EmptyState({ canRestore, onNewWorkspace, onRestoreTab }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-dock-muted">
      <p className="text-[15px]">Aucun workspace ouvert.</p>
      <div className="flex gap-3">
        <button type="button" className="cursor-pointer rounded border border-dock-green px-3 py-1.5 text-[13px] text-dock-green-deep hover:bg-dock-green-soft" data-tip="Créer un workspace avec un terminal dans votre dossier utilisateur" onClick={onNewWorkspace}>
          Nouveau workspace
        </button>
        {canRestore && (
          <button type="button" className="cursor-pointer rounded border border-dock-line px-3 py-1.5 text-[13px] text-dock-ink hover:bg-dock-green-hover" data-tip="Rouvrir le dernier onglet fermé (Ctrl + Maj + Z)" onClick={onRestoreTab}>
            Rouvrir le dernier onglet fermé
          </button>
        )}
      </div>
    </div>
  )
}
