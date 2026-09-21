interface HeaderProps {
  workspaceName: string
  sidebarCollapsed: boolean
  leaderActive: boolean
  onToggleSidebar: () => void
}

export function Header({ workspaceName, sidebarCollapsed, leaderActive, onToggleSidebar }: HeaderProps) {
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
        <span className="truncate text-[16px]">{workspaceName}</span>
      </div>
      {leaderActive && <span className="rounded bg-dock-focus px-2 py-0.5 text-xs font-semibold text-dock-terminal">Leader…</span>}
      <span className="ml-auto text-[11px] text-dock-muted">Ctrl + Espace puis T / V / H / W / X / flèche · Ctrl + Maj + lettre · Alt + flèche · Ctrl + P</span>
    </header>
  )
}
