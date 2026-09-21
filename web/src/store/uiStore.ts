import { create } from 'zustand'

export enum RenameOrigin {
  Header = 'header',
  Panel = 'panel',
}

interface UiState {
  renamingWorkspaceId: string | null
  renameOrigin: RenameOrigin
  renamingTabId: string | null
  startRenamingTab: (tabId: string) => void
  stopRenamingTab: () => void
  startRenamingWorkspace: (workspaceId: string, origin: RenameOrigin) => void
  stopRenamingWorkspace: () => void
}

export const useUiStore = create<UiState>()((set) => ({
  renamingWorkspaceId: null,
  renameOrigin: RenameOrigin.Header,
  renamingTabId: null,
  startRenamingTab: (renamingTabId) => set({ renamingTabId }),
  stopRenamingTab: () => set({ renamingTabId: null }),
  startRenamingWorkspace: (renamingWorkspaceId, renameOrigin) => set({ renamingWorkspaceId, renameOrigin }),
  stopRenamingWorkspace: () => set({ renamingWorkspaceId: null }),
}))
