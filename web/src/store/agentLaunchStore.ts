import { create } from 'zustand'
import type { AgentLaunchMode, AgentLaunchTarget } from '../model/session'

export const ACTIVE_PANE_SOURCE = 'active'
export const NEW_WORKTREE_SOURCE = 'new-worktree'

export interface AgentLaunchDraft {
  source: string
  task: string
  mode: AgentLaunchMode
  target: AgentLaunchTarget
  request: number | null
}

interface AgentLaunchState {
  draft: AgentLaunchDraft | null
  setDraft: (draft: AgentLaunchDraft | null) => void
}

export const useAgentLaunchStore = create<AgentLaunchState>()((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
}))
