import { create } from 'zustand'

export enum PaneStateKind {
  Failed = 'failed',
  Exited = 'exited',
}

export interface PaneState {
  kind: PaneStateKind
  message: string
}

interface PaneStoreState {
  states: Record<string, PaneState>
  markFailed: (paneId: string, message: string) => void
  markExited: (paneId: string, code: number) => void
  clear: (paneId: string) => void
}

const without = (states: Record<string, PaneState>, paneId: string): Record<string, PaneState> => {
  const { [paneId]: _removed, ...rest } = states
  return rest
}

export const usePaneStore = create<PaneStoreState>()((set) => ({
  states: {},
  markFailed: (paneId, message) =>
    set((state) => (state.states[paneId]?.kind === PaneStateKind.Exited ? state : { states: { ...state.states, [paneId]: { kind: PaneStateKind.Failed, message } } })),
  markExited: (paneId, code) =>
    set((state) => ({ states: { ...state.states, [paneId]: { kind: PaneStateKind.Exited, message: `Le shell s’est terminé (code ${code}).` } } })),
  clear: (paneId) => set((state) => ({ states: without(state.states, paneId) })),
}))
