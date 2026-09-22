import type { Session } from '../model/session'

export interface ShellProfile {
  id: string
  name: string
  executable: string
  arguments: string
  available: boolean
  reportsCurrentDirectory: boolean
}

export enum PickTarget {
  File = 'file',
  Folder = 'folder',
}

export interface PickedPath {
  field: string
  path: string
}

export enum OpenTarget {
  Editor = 'editor',
  Explorer = 'explorer',
}

export interface GitContext {
  isRepository: boolean
  branch: string | null
  detachedHead: boolean
}

export interface PersistenceSettings {
  textIntervalSeconds: number
  linesPerPane: number
  maxTextMebibytes: number
}

export interface Settings {
  shells: Record<string, string>
  editor: string
  persistence: PersistenceSettings
  projectsRoot: string
}

export interface ShellSetting {
  id: string
  name: string
  defaultExecutable: string
  configured: string
  available: boolean
}

export interface ImportedPreferences {
  settings: Settings
  path: string
}

export interface AgentHooksInfo {
  script: string
  stateDirectory: string
  settingsFile: string
  hooksInstalled: boolean
}

export interface SettingsSnapshot {
  settings: Settings
  shellSettings: ShellSetting[]
  files: Record<string, string>
  warnings: string[]
  agents: AgentHooksInfo
}

export interface Project {
  name: string
  path: string
}

export interface PaneActivity {
  paneId: string
  processes: string[]
}

export enum AgentState {
  Working = 'working',
  Waiting = 'waiting',
  Done = 'done',
  Error = 'error',
  Unknown = 'unknown',
}

export interface PaneAgent {
  paneId: string
  agent: string
  state: AgentState
  message?: string
}

export type HostToWebMessage =
  | { type: 'app.hello'; session: Session; shells: ShellProfile[]; home: string; text: Record<string, string>; persistence: PersistenceSettings; recovery?: string }
  | { type: 'app.closing'; activity: PaneActivity[] }
  | { type: 'session.saved' }
  | { type: 'session.saveFailed'; message: string }
  | ({ type: 'dialog.picked' } & PickedPath)
  | ({ type: 'settings.result'; shells: ShellProfile[]; persistence: PersistenceSettings; saved: boolean } & SettingsSnapshot)
  | { type: 'settings.exported'; path: string }
  | ({ type: 'settings.imported' } & ImportedPreferences)
  | { type: 'terminal.created'; pane: string; pid: number }
  | { type: 'terminal.output'; pane: string; data: string }
  | { type: 'terminal.cwd'; pane: string; path: string }
  | { type: 'terminal.exit'; pane: string; code: number }
  | { type: 'terminal.pathMissing'; pane: string; path: string; fallback: string }
  | { type: 'terminal.activityResult'; panes: PaneActivity[] }
  | { type: 'agent.states'; panes: PaneAgent[] }
  | { type: 'projects.listed'; root: string; projects: Project[]; error?: string }
  | { type: 'context.result'; pane: string; path: string; git: GitContext }
  | { type: 'error'; pane?: string; message: string }

export type WebToHostMessage =
  | { type: 'app.ready' }
  | { type: 'session.save'; session: Session }
  | { type: 'text.save'; text: Record<string, string> }
  | { type: 'settings.get' }
  | { type: 'settings.save'; settings: Settings }
  | { type: 'settings.export' }
  | { type: 'settings.import' }
  | { type: 'agents.installHooks' }
  | { type: 'agents.removeHooks' }
  | { type: 'dialog.pick'; field: string; target: PickTarget }
  | { type: 'terminal.create'; pane: string; shell: string; cwd: string; cols: number; rows: number }
  | { type: 'terminal.input'; pane: string; data: string }
  | { type: 'terminal.resize'; pane: string; cols: number; rows: number }
  | { type: 'terminal.ack'; pane: string; chars: number }
  | { type: 'terminal.close'; pane: string }
  | { type: 'terminal.activity'; panes: string[] }
  | { type: 'projects.list' }
  | { type: 'context.query'; pane: string; path: string }
  | { type: 'context.open'; pane: string; path: string; target: OpenTarget }
  | { type: 'window.close' }
  | { type: 'window.closeCancel' }

export type HostMessageType = HostToWebMessage['type']
export type HostMessageOf<T extends HostMessageType> = Extract<HostToWebMessage, { type: T }>
