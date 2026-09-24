import type { ReactNode } from 'react'
import { IconName } from './iconName'

interface IconProps {
  name: IconName
  size?: number
  className?: string
}

const DEFAULT_SIZE = 12

const SHAPES: Record<IconName, ReactNode> = {
  [IconName.Chevron]: <path d="M4.5 2.5 8 6l-3.5 3.5" />,
  [IconName.Close]: <path d="M3 3l6 6M9 3 3 9" />,
  [IconName.Plus]: <path d="M6 2.2v7.6M2.2 6h7.6" />,
  [IconName.Project]: (
    <>
      <path d="M1.5 9V3.3a.8.8 0 0 1 .8-.8h2.4l1 1.1h3.7a.8.8 0 0 1 .8.8v1.1" />
      <path d="M1.5 9h3.3" />
      <circle cx="7.9" cy="7.9" r="1.8" />
      <path d="m9.2 9.2 1.3 1.3" />
    </>
  ),
}

export function Icon({ name, size = DEFAULT_SIZE, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {SHAPES[name]}
    </svg>
  )
}
