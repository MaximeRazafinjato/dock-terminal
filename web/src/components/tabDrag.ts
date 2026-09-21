import type { PointerEvent as ReactPointerEvent } from 'react'
import { useUiStore, type TabDropTarget } from '../store/uiStore'

const DRAG_THRESHOLD_PX = 4
const PRIMARY_BUTTON = 0

export type MoveTabHandler = (tabId: string, workspaceId: string, beforeTabId?: string) => void

const dropTargetAt = (x: number, y: number): TabDropTarget | null => {
  const element = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-drop-workspace]')
  if (!element?.dataset.dropWorkspace) {
    return null
  }
  return { workspaceId: element.dataset.dropWorkspace, beforeTabId: element.dataset.dropTab }
}

export const isDropTarget = (target: TabDropTarget | null, workspaceId: string, beforeTabId?: string): boolean =>
  target !== null && target.workspaceId === workspaceId && target.beforeTabId === beforeTabId

export const beginTabDrag = (event: ReactPointerEvent<HTMLElement>, tabId: string, onMove: MoveTabHandler): void => {
  if (event.button !== PRIMARY_BUTTON) {
    return
  }
  const source = event.currentTarget
  const { pointerId, clientX: startX, clientY: startY } = event
  let dragging = false

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
    useUiStore.getState().setTabDropTarget(dropTargetAt(move.clientX, move.clientY))
  }
  const handleEnd = () => {
    source.removeEventListener('pointermove', handleMove)
    source.removeEventListener('pointerup', handleEnd)
    source.removeEventListener('pointercancel', handleEnd)
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
