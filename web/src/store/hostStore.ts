import { create } from 'zustand'
import type { ShellProfile } from '../bridge/messages'

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
  setHello: (shells: ShellProfile[], home: string) => void
  setStatus: (text: string, level?: StatusLevel) => void
  setLeaderActive: (active: boolean) => void
}

export const useHostStore = create<HostState>()((set) => ({
  connected: false,
  shells: [],
  home: '',
  status: { text: 'Connexion à l’hôte…', level: StatusLevel.Info },
  leaderActive: false,
  setHello: (shells, home) => set({ connected: true, shells, home }),
  setStatus: (text, level = StatusLevel.Info) => set({ status: { text, level } }),
  setLeaderActive: (leaderActive) => set({ leaderActive }),
}))
