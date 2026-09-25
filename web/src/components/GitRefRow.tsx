import type { KeyboardEvent, MouseEvent } from 'react'
import { Icon } from './Icon'
import { IconName } from './iconName'
import { ROW_ACTION } from './rightPanelStyles'
import { isMenuKey } from './workspacePanel'

interface GitRefRowProps {
  rowKey: string
  icon: IconName
  name: string
  meta?: string
  metaTip?: string
  tip?: string
  current?: boolean
  indent?: boolean
  focusable: boolean
  onFocus: (key: string) => void
  onActivate: () => void
  onSelect?: () => void
  onMenu: (x: number, y: number) => void
}

export function GitRefRow({ rowKey, icon, name, meta, metaTip, tip, current = false, indent = false, focusable, onFocus, onActivate, onSelect, onMenu }: GitRefRowProps) {
  const handleClick = () => {
    onFocus(rowKey)
    onSelect?.()
  }
  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault()
    onFocus(rowKey)
    onMenu(event.clientX, event.clientY)
  }
  const handleMoreClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    const rect = event.currentTarget.getBoundingClientRect()
    onMenu(rect.left, rect.bottom)
  }
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
      onActivate()
    } else if (isMenuKey(event)) {
      event.preventDefault()
      event.stopPropagation()
      const rect = event.currentTarget.getBoundingClientRect()
      onMenu(rect.left + 24, rect.bottom)
    }
  }

  return (
    <div
      role="option"
      aria-selected={current}
      data-git-row={rowKey}
      tabIndex={focusable ? 0 : -1}
      data-tip={tip}
      className={`group flex h-[24px] cursor-pointer items-center gap-[6px] pr-[4px] text-[12px] select-none hover:bg-dock-green-hover ${indent ? 'pl-[26px]' : 'pl-[12px]'} ${current ? 'text-dock-green-deep' : 'text-dock-ink-soft hover:text-dock-ink'}`}
      onClick={handleClick}
      onDoubleClick={onActivate}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
    >
      <Icon name={icon} className="shrink-0 text-dock-muted" />
      <span className={`min-w-0 flex-1 truncate ${current ? 'font-semibold' : ''}`}>{name}</span>
      {meta && (
        <span className="shrink-0 font-mono text-[11px] text-dock-muted" data-tip={metaTip}>
          {meta}
        </span>
      )}
      <button type="button" tabIndex={-1} className={`${ROW_ACTION} opacity-0 group-focus-within:opacity-100 group-hover:opacity-100`} aria-label={`Actions de ${name}`} data-tip="Actions (clic droit, Maj + F10)" onClick={handleMoreClick}>
        <Icon name={IconName.More} />
      </button>
    </div>
  )
}
