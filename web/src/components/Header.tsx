import { EditableName } from './EditableName'
import { InlineNameEditor } from './InlineNameEditor'

interface HeaderProps {
  workspaceName: string
  renaming: boolean
  sidebarCollapsed: boolean
  leaderActive: boolean
  onToggleSidebar: () => void
  onStartRename: () => void
  onCommitRename: (name: string) => void
  onCancelRename: () => void
}

export function Header({ workspaceName, renaming, sidebarCollapsed, leaderActive, onToggleSidebar, onStartRename, onCommitRename, onCancelRename }: HeaderProps) {
  return (
    <header className="flex h-[42px] shrink-0 items-center gap-4 border-b border-dock-line bg-dock-panel px-3 text-dock-ink">
      <button
        type="button"
        className="rounded border border-dock-line px-2 text-lg leading-tight text-dock-muted hover:bg-dock-green-hover hover:text-dock-ink"
        title={sidebarCollapsed ? 'Afficher les workspaces' : 'Masquer les workspaces'}
        onClick={onToggleSidebar}
      >
        ☰
      </button>
      <div className="flex min-w-0 items-baseline gap-4">
        <span className="text-[17px] font-semibold text-dock-green">Dock</span>
        {renaming ? (
          <InlineNameEditor value={workspaceName} label="Nom du workspace" className="w-64 text-[16px]" onCommit={onCommitRename} onCancel={onCancelRename} />
        ) : (
          <EditableName name={workspaceName} className="text-[16px]" onClick={onStartRename} />
        )}
      </div>
      {leaderActive && <span className="rounded bg-dock-focus px-2 py-0.5 text-xs font-semibold text-dock-terminal">Leader…</span>}
    </header>
  )
}
