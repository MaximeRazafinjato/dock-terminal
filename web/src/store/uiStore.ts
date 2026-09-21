import { create } from 'zustand'

export enum RenameOrigin {
  Header = 'header',
  Panel = 'panel',
}

interface UiState {
  renamingWorkspaceId: string | null
  renameOrigin: RenameOrigin
  startRenamingWorkspace: (workspaceId: string, origin: RenameOrigin) => void
  stopRenamingWorkspace: () => void
}

export const useUiStore = create<UiState>()((set) => ({
  renamingWorkspaceId: null,
  renameOrigin: RenameOrigin.Header,
  startRenamingWorkspace: (renamingWorkspaceId, renameOrigin) => set({ renamingWorkspaceId, renameOrigin }),
  stopRenamingWorkspace: () => set({ renamingWorkspaceId: null }),
}))
