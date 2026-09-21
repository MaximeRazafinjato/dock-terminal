import type { DragEvent } from 'react'

const TAB_DRAG_TYPE = 'application/x-dock-tab'

export const startTabDrag = (event: DragEvent, tabId: string): void => {
  event.dataTransfer.setData(TAB_DRAG_TYPE, tabId)
  event.dataTransfer.effectAllowed = 'move'
}

export const isTabDrag = (event: DragEvent): boolean => event.dataTransfer.types.includes(TAB_DRAG_TYPE)

export const acceptTabDrag = (event: DragEvent): boolean => {
  if (!isTabDrag(event)) {
    return false
  }
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  return true
}

export const droppedTabId = (event: DragEvent): string => {
  event.preventDefault()
  return event.dataTransfer.getData(TAB_DRAG_TYPE)
}
