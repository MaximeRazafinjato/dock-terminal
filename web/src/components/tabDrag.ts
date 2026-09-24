import type { PointerEvent as ReactPointerEvent } from 'react'
import { useUiStore, type TabDropTarget } from '../store/uiStore'

const DRAG_THRESHOLD_PX = 4
const PRIMARY_BUTTON = 0
const SPRING_DELAY_MS = 600

export type MoveTabHandler = (tabId: string, workspaceId: string, beforeTabId?: string) => void

const dropTargetAt = (x: number, y: number): TabDropTarget | null => {
  const element = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-drop-workspace]')
  if (!element?.dataset.dropWorkspace) {
    return null
  }
  return { workspaceId: element.dataset.dropWorkspace, beforeTabId: element.dataset.dropTab }
}

const springWorkspaceAt = (x: number, y: number): string | undefined =>
  document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-spring-workspace]')?.dataset.springWorkspace

export const isDropTarget = (target: TabDropTarget | null, workspaceId: string, beforeTabId?: string): boolean =>
  target !== null && target.workspaceId === workspaceId && target.beforeTabId === beforeTabId

const sameDropTarget = (left: TabDropTarget | null, right: TabDropTarget | null): boolean =>
  left === right || (left !== null && right !== null && isDropTarget(left, right.workspaceId, right.beforeTabId))

export const beginTabDrag = (event: ReactPointerEvent<HTMLElement>, tabId: string, onMove: MoveTabHandler): void => {
  if (event.button !== PRIMARY_BUTTON) {
    return
  }
  const source = event.currentTarget
  const { pointerId, clientX: startX, clientY: startY } = event
  let dragging = false
  let springCandidate: string | undefined
  let springTimer: ReturnType<typeof setTimeout> | undefined

  const followSpringCandidate = (x: number, y: number) => {
    const candidate = springWorkspaceAt(x, y)
    if (candidate === springCandidate) {
      return
    }
    springCandidate = candidate
    clearTimeout(springTimer)
    if (candidate) {
      springTimer = setTimeout(() => useUiStore.getState().openSpringWorkspace(candidate), SPRING_DELAY_MS)
    }
  }
  const handleMove = (move: PointerEvent) => {
    if (!dragging) {
      if (Math.abs(move.clientX - startX) < DRAG_THRESHOLD_PX && Math.abs(move.clientY - startY) < DRAG_THRESHOLD_PX) {
        return
      }
      dragging = true
      source.setPointerCapture(pointerId)
      document.body.style.cursor = 'grabbing'
      useUiStore.getState().startDraggingTab(tabId)
    }
    const target = dropTargetAt(move.clientX, move.clientY)
    const { tabDropTarget, setTabDropTarget } = useUiStore.getState()
    if (!sameDropTarget(tabDropTarget, target)) {
      setTabDropTarget(target)
    }
    followSpringCandidate(move.clientX, move.clientY)
  }
  const handleEnd = () => {
    source.removeEventListener('pointermove', handleMove)
    source.removeEventListener('pointerup', handleEnd)
    source.removeEventListener('pointercancel', handleEnd)
    clearTimeout(springTimer)
    if (!dragging) {
      return
    }
    const { tabDropTarget, stopDraggingTab } = useUiStore.getState()
    document.body.style.cursor = ''
    stopDraggingTab()
    if (tabDropTarget) {
      onMove(tabId, tabDropTarget.workspaceId, tabDropTarget.beforeTabId)
    }
  }
  source.addEventListener('pointermove', handleMove)
  source.addEventListener('pointerup', handleEnd)
  source.addEventListener('pointercancel', handleEnd)
}
