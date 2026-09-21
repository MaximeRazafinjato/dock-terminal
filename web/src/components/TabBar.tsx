import type { Workspace } from '../model/session'

interface TabBarProps {
  workspace: Workspace
  onSelect: (tabId: string) => void
  onClose: (tabId: string) => void
  onNew: () => void
}

export function TabBar({ workspace, onSelect, onClose, onNew }: TabBarProps) {
  return (
    <div role="tablist" className="flex shrink-0 items-center gap-1 px-2 pt-1">
      {workspace.tabs.map((tab) => {
        const active = tab.id === workspace.active
        const handleSelect = () => onSelect(tab.id)
        const handleClose = () => onClose(tab.id)
        return (
          <div
            key={tab.id}
            className={`flex min-w-[100px] items-center rounded-t-md border border-b-0 ${active ? 'border-dock-line bg-dock-panel text-dock-green-deep' : 'border-transparent text-dock-muted hover:bg-dock-green-hover'}`}
          >
            <button type="button" role="tab" aria-selected={active} className="truncate px-3 py-2 text-xs" onClick={handleSelect}>
              {tab.name}
            </button>
            <button type="button" className="px-2 text-xs hover:text-dock-error" title="Fermer l’onglet" onClick={handleClose}>
              ×
            </button>
          </div>
        )
      })}
      <button type="button" className="rounded px-2 py-1 text-base hover:bg-dock-green-hover" title="Nouvel onglet PowerShell" onClick={onNew}>
        +
      </button>
    </div>
  )
}
