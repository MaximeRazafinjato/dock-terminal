import type { Session } from '../model/session'

export interface ShellProfile {
  id: string
  name: string
  executable: string
  arguments: string
  available: boolean
  reportsCurrentDirectory: boolean
}

export type HostToWebMessage =
  | { type: 'app.hello'; session: Session; shells: ShellProfile[]; home: string }
  | { type: 'terminal.created'; pane: string; pid: number }
  | { type: 'terminal.output'; pane: string; data: string }
  | { type: 'terminal.cwd'; pane: string; path: string }
  | { type: 'terminal.exit'; pane: string; code: number }
  | { type: 'error'; pane?: string; message: string }

export type WebToHostMessage =
  | { type: 'app.ready' }
  | { type: 'session.save'; session: Session }
  | { type: 'terminal.create'; pane: string; shell: string; cwd: string; cols: number; rows: number }
  | { type: 'terminal.input'; pane: string; data: string }
  | { type: 'terminal.resize'; pane: string; cols: number; rows: number }
  | { type: 'terminal.ack'; pane: string; chars: number }
  | { type: 'terminal.close'; pane: string }
  | { type: 'window.close' }

export type HostMessageType = HostToWebMessage['type']
export type HostMessageOf<T extends HostMessageType> = Extract<HostToWebMessage, { type: T }>
