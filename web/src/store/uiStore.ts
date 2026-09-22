import { create } from 'zustand'

export enum RenameOrigin {
  Header = 'header',
  Panel = 'panel',
}

export interface TabDropTarget {
  workspaceId: string
  beforeTabId?: string
}

export interface PaneActivityView {
  paneId: string
  label: string
  processes: string[]
}

export interface CloseConfirmation {
  title: string
  panes: PaneActivityView[]
}

interface UiState {
  renamingWorkspaceId: string | null
  renameOrigin: RenameOrigin
  renamingTabId: string | null
  draggingTabId: string | null
  tabDropTarget: TabDropTarget | null
  paletteOpen: boolean
  openPalette: () => void
  closePalette: () => void
  projectPickerOpen: boolean
  openProjectPicker: () => void
  closeProjectPicker: () => void
  settingsOpen: boolean
  openSettings: () => void
  closeSettings: () => void
  closeConfirmation: CloseConfirmation | null
  showCloseConfirmation: (confirmation: CloseConfirmation) => void
  hideCloseConfirmation: () => void
  startRenamingTab: (tabId: string) => void
  stopRenamingTab: () => void
  startRenamingWorkspace: (workspaceId: string, origin: RenameOrigin) => void
  stopRenamingWorkspace: () => void
  startDraggingTab: (tabId: string) => void
  setTabDropTarget: (target: TabDropTarget | null) => void
  stopDraggingTab: () => void
}

export const useUiStore = create<UiState>()((set) => ({
  renamingWorkspaceId: null,
  renameOrigin: RenameOrigin.Header,
  renamingTabId: null,
  draggingTabId: null,
  tabDropTarget: null,
  paletteOpen: false,
  openPalette: () => set({ paletteOpen: true, projectPickerOpen: false, settingsOpen: false }),
  closePalette: () => set({ paletteOpen: false }),
  projectPickerOpen: false,
  openProjectPicker: () => set({ projectPickerOpen: true, paletteOpen: false, settingsOpen: false }),
  closeProjectPicker: () => set({ projectPickerOpen: false }),
  settingsOpen: false,
  openSettings: () => set({ settingsOpen: true, paletteOpen: false, projectPickerOpen: false }),
  closeSettings: () => set({ settingsOpen: false }),
  closeConfirmation: null,
  showCloseConfirmation: (closeConfirmation) => set({ closeConfirmation }),
  hideCloseConfirmation: () => set({ closeConfirmation: null }),
  startRenamingTab: (renamingTabId) => set({ renamingTabId }),
  stopRenamingTab: () => set({ renamingTabId: null }),
  startRenamingWorkspace: (renamingWorkspaceId, renameOrigin) => set({ renamingWorkspaceId, renameOrigin }),
  stopRenamingWorkspace: () => set({ renamingWorkspaceId: null }),
  startDraggingTab: (draggingTabId) => set({ draggingTabId, tabDropTarget: null }),
  setTabDropTarget: (tabDropTarget) => set({ tabDropTarget }),
  stopDraggingTab: () => set({ draggingTabId: null, tabDropTarget: null }),
}))
