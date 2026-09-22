import { create } from 'zustand'
import type { GitContext, Project, ShellProfile } from '../bridge/messages'

export enum StatusLevel {
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
}

interface HostState {
  connected: boolean
  shells: ShellProfile[]
  home: string
  status: { text: string; level: StatusLevel }
  leaderActive: boolean
  projects: Project[]
  projectsRoot: string
  projectsError: string | null
  contexts: Record<string, GitContext>
  setHello: (shells: ShellProfile[], home: string) => void
  setStatus: (text: string, level?: StatusLevel) => void
  setLeaderActive: (active: boolean) => void
  setProjects: (root: string, projects: Project[], error: string | null) => void
  setContext: (paneId: string, context: GitContext) => void
}

export const useHostStore = create<HostState>()((set) => ({
  connected: false,
  shells: [],
  home: '',
  status: { text: 'Connexion à l’hôte…', level: StatusLevel.Info },
  leaderActive: false,
  projects: [],
  projectsRoot: '',
  projectsError: null,
  contexts: {},
  setHello: (shells, home) => set({ connected: true, shells, home }),
  setStatus: (text, level = StatusLevel.Info) => set({ status: { text, level } }),
  setLeaderActive: (leaderActive) => set({ leaderActive }),
  setProjects: (projectsRoot, projects, projectsError) => set({ projectsRoot, projects, projectsError }),
  setContext: (paneId, context) => set((state) => ({ contexts: { ...state.contexts, [paneId]: context } })),
}))
