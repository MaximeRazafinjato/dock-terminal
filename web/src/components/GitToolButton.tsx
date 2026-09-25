import { Icon } from './Icon'
import type { IconName } from './iconName'

interface GitToolButtonProps {
  icon: IconName
  tip: string
  label?: string
  disabled?: boolean
  onClick: () => void
}

export function GitToolButton({ icon, tip, label, disabled = false, onClick }: GitToolButtonProps) {
  const handleClick = () => {
    if (!disabled) {
      onClick()
    }
  }

  return (
    <button
      type="button"
      aria-label={label ?? tip}
      aria-disabled={disabled}
      data-tip={tip}
      className="flex h-[24px] shrink-0 items-center gap-[5px] rounded-md px-[6px] text-[12px] text-dock-ink-soft hover:bg-dock-green-hover hover:text-dock-ink aria-disabled:cursor-default aria-disabled:opacity-40 aria-disabled:hover:bg-transparent aria-disabled:hover:text-dock-ink-soft"
      onClick={handleClick}
    >
      <Icon name={icon} />
      {label && <span className="whitespace-nowrap @max-[340px]:hidden">{label}</span>}
    </button>
  )
}
