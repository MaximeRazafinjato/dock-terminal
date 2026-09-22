import { create } from 'zustand'
import type { Project, ShellProfile } from '../bridge/messages'

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
  setHello: (shells: ShellProfile[], home: string) => void
  setStatus: (text: string, level?: StatusLevel) => void
  setLeaderActive: (active: boolean) => void
  setProjects: (root: string, projects: Project[], error: string | null) => void
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
  setHello: (shells, home) => set({ connected: true, shells, home }),
  setStatus: (text, level = StatusLevel.Info) => set({ status: { text, level } }),
  setLeaderActive: (leaderActive) => set({ leaderActive }),
  setProjects: (projectsRoot, projects, projectsError) => set({ projectsRoot, projects, projectsError }),
}))
