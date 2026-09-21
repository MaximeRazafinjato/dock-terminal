import { create } from 'zustand'

interface UiState {
  renamingWorkspaceId: string | null
  startRenamingWorkspace: (workspaceId: string) => void
  stopRenamingWorkspace: () => void
}

export const useUiStore = create<UiState>()((set) => ({
  renamingWorkspaceId: null,
  startRenamingWorkspace: (renamingWorkspaceId) => set({ renamingWorkspaceId }),
  stopRenamingWorkspace: () => set({ renamingWorkspaceId: null }),
}))
