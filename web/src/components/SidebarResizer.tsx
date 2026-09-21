import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { SIDEBAR_MAX, SIDEBAR_MIN } from '../model/session'

const KEYBOARD_STEP = 15

interface SidebarResizerProps {
  width: number
  onResize: (width: number) => void
}

export function SidebarResizer({ width, onResize }: SidebarResizerProps) {
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null)

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { startX: event.clientX, startWidth: width }
  }
  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      onResize(dragRef.current.startWidth + event.clientX - dragRef.current.startX)
    }
  }
  const handlePointerUp = () => {
    dragRef.current = null
  }
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      onResize(width + (event.key === 'ArrowRight' ? KEYBOARD_STEP : -KEYBOARD_STEP))
    }
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Largeur du panneau des workspaces"
      aria-valuemin={SIDEBAR_MIN}
      aria-valuemax={SIDEBAR_MAX}
      aria-valuenow={width}
      tabIndex={0}
      className="w-1 shrink-0 cursor-col-resize bg-dock-line hover:bg-dock-green focus-visible:bg-dock-focus focus-visible:outline-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
    />
  )
}
