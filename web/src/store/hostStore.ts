import { create } from 'zustand'
import type { GitContext, PersistenceSettings, Project, ShellProfile } from '../bridge/messages'

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
  unsaved: boolean
  persistence: PersistenceSettings
  setHello: (shells: ShellProfile[], home: string, persistence: PersistenceSettings) => void
  setUnsaved: (unsaved: boolean) => void
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
  unsaved: false,
  persistence: { textIntervalSeconds: 30, linesPerPane: 10000 },
  setHello: (shells, home, persistence) => set({ connected: true, shells, home, persistence }),
  setUnsaved: (unsaved) => set({ unsaved }),
  setStatus: (text, level = StatusLevel.Info) => set({ status: { text, level } }),
  setLeaderActive: (leaderActive) => set({ leaderActive }),
  setProjects: (projectsRoot, projects, projectsError) => set({ projectsRoot, projects, projectsError }),
  setContext: (paneId, context) => set((state) => ({ contexts: { ...state.contexts, [paneId]: context } })),
}))
