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
  [IconName.Explorer]: (
    <>
      <rect x="1.5" y="2" width="9" height="8" rx="1" />
      <path d="M7.3 2v8" />
    </>
  ),
  [IconName.File]: (
    <>
      <path d="M3 1.5h3.8L9.5 4.2v5.8a.5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5V2a.5.5 0 0 1 .5-.5Z" />
      <path d="M6.8 1.5v2.7h2.7" />
    </>
  ),
  [IconName.Folder]: <path d="M1.5 9.2V2.8a.8.8 0 0 1 .8-.8h2.5l1 1.1h3.9a.8.8 0 0 1 .8.8v5.3a.8.8 0 0 1-.8.8H2.3a.8.8 0 0 1-.8-.8Z" />,
  [IconName.NewFile]: (
    <>
      <path d="M6 10.5H3a.5.5 0 0 1-.5-.5V2a.5.5 0 0 1 .5-.5h3.3L9 4.2V6" />
      <path d="M6.3 1.5v2.7H9M9 7.6v3M7.5 9.1h3" />
    </>
  ),
  [IconName.NewFolder]: (
    <>
      <path d="M5.8 10H2.3a.8.8 0 0 1-.8-.8V2.8a.8.8 0 0 1 .8-.8h2.5l1 1.1h3.9a.8.8 0 0 1 .8.8v1.8" />
      <path d="M9 7v3.2M7.4 8.6h3.2" />
    </>
  ),
  [IconName.Plus]: <path d="M6 2.2v7.6M2.2 6h7.6" />,
  [IconName.Project]: (
    <>
      <path d="M1.5 9V3.3a.8.8 0 0 1 .8-.8h2.4l1 1.1h3.7a.8.8 0 0 1 .8.8v1.1" />
      <path d="M1.5 9h3.3" />
      <circle cx="7.9" cy="7.9" r="1.8" />
      <path d="m9.2 9.2 1.3 1.3" />
    </>
  ),
  [IconName.Refresh]: (
    <>
      <path d="M10 6a4 4 0 1 1-1.2-2.85" />
      <path d="M9.3 1.6v2H7.3" />
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
