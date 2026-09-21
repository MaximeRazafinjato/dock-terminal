import { create } from 'zustand'

export enum RenameOrigin {
  Header = 'header',
  Panel = 'panel',
}

export interface TabDropTarget {
  workspaceId: string
  beforeTabId?: string
}

interface UiState {
  renamingWorkspaceId: string | null
  renameOrigin: RenameOrigin
  renamingTabId: string | null
  draggingTabId: string | null
  tabDropTarget: TabDropTarget | null
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
  startRenamingTab: (renamingTabId) => set({ renamingTabId }),
  stopRenamingTab: () => set({ renamingTabId: null }),
  startRenamingWorkspace: (renamingWorkspaceId, renameOrigin) => set({ renamingWorkspaceId, renameOrigin }),
  stopRenamingWorkspace: () => set({ renamingWorkspaceId: null }),
  startDraggingTab: (draggingTabId) => set({ draggingTabId, tabDropTarget: null }),
  setTabDropTarget: (tabDropTarget) => set({ tabDropTarget }),
  stopDraggingTab: () => set({ draggingTabId: null, tabDropTarget: null }),
}))
