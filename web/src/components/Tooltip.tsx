import { useEffect, useState } from 'react'

const TIP_ATTRIBUTE = 'data-tip'
const SHOW_DELAY_MS = 250
const GAP_PX = 6
const EDGE_MARGIN_PX = 8

interface TooltipState {
  text: string
  x: number
  y: number
  above: boolean
}

const tipTargetOf = (target: EventTarget | null): HTMLElement | null => (target instanceof Element ? target.closest<HTMLElement>(`[${TIP_ATTRIBUTE}]`) : null)

const placeFor = (element: HTMLElement, text: string): TooltipState => {
  const rect = element.getBoundingClientRect()
  const above = rect.bottom + GAP_PX > window.innerHeight - 40
  return { text, x: Math.min(Math.max(rect.left + rect.width / 2, EDGE_MARGIN_PX), window.innerWidth - EDGE_MARGIN_PX), y: above ? rect.top - GAP_PX : rect.bottom + GAP_PX, above }
}

export function Tooltip() {
  const [state, setState] = useState<TooltipState | null>(null)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    let current: HTMLElement | null = null
    const hide = () => {
      clearTimeout(timer)
      current = null
      setState(null)
    }
    const show = (element: HTMLElement) => {
      const text = element.getAttribute(TIP_ATTRIBUTE)
      if (!text || element === current) {
        return
      }
      clearTimeout(timer)
      current = element
      timer = setTimeout(() => setState(placeFor(element, text)), SHOW_DELAY_MS)
    }
    const handlePointerOver = (event: PointerEvent) => {
      const element = tipTargetOf(event.target)
      if (element) {
        show(element)
      } else {
        hide()
      }
    }
    const handleFocusIn = (event: FocusEvent) => {
      const element = tipTargetOf(event.target)
      if (element && element.matches(':focus-visible')) {
        show(element)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        hide()
      }
    }
    document.addEventListener('pointerover', handlePointerOver)
    document.addEventListener('pointerdown', hide)
    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', hide)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', hide, true)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('pointerover', handlePointerOver)
      document.removeEventListener('pointerdown', hide)
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('focusout', hide)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', hide, true)
    }
  }, [])

  if (!state) {
    return null
  }
  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-50 max-w-[360px] rounded border border-dock-line bg-dock-panel px-2 py-1 text-[11px] leading-snug text-dock-ink shadow-lg"
      style={{ left: state.x, top: state.y, transform: `translate(-50%, ${state.above ? '-100%' : '0'})` }}
    >
      {state.text}
    </div>
  )
}
