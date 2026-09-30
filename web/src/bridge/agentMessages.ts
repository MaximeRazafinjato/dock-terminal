import type { AgentLaunchMode } from '../model/session'
import type { AgentState } from './messages'

export interface AgentAction {
  tool: string
  target?: string
}

export interface AgentFileChange {
  path: string
  name: string
  added: number
  removed: number
}

export interface AgentContext {
  tokens: number
  window?: number
  percent?: number
}

export interface AgentPullRequest {
  number?: number
  url: string
  repository?: string
}

export enum AgentRequestKind {
  Permission = 'permission',
  Question = 'question',
}

export interface AgentQuestionOption {
  label: string
  description?: string
}

export interface AgentQuestion {
  question: string
  header?: string
  options: AgentQuestionOption[]
  multiSelect: boolean
}

export interface AgentRequest {
  id: string
  kind: AgentRequestKind
  tool: string
  rule?: string
  questions: AgentQuestion[]
  answerable: boolean
}

export enum AgentAnswer {
  Allow = 'allow',
  Deny = 'deny',
  Always = 'always',
  Option = 'option',
}

export interface AgentCard {
  paneId: string
  agent: string
  state: AgentState
  since: number
  message?: string
  detail?: string
  interrupted: boolean
  sessionId?: string
  title?: string
  summary?: string
  lastMessage?: string
  action?: AgentAction
  files: AgentFileChange[]
  context?: AgentContext
  pullRequest?: AgentPullRequest
  request?: AgentRequest
}

export interface AgentHistoryItem {
  sessionId: string
  directory: string
  paneId?: string
  location?: string
  title?: string
  startedAt: number
  endedAt?: number
  lastMessage?: string
  files: AgentFileChange[]
  state: AgentState
  live: boolean
  pendingResume: boolean
  resumable: boolean
  reason?: string
}

export type AgentHostMessage =
  | { type: 'agent.board'; cards: AgentCard[] }
  | { type: 'agent.responded'; pane: string }
  | { type: 'agent.send'; pane: string; text: string }
  | { type: 'agent.launchPrepared'; request: number; sessionId: string; command: string }
  | { type: 'agent.history'; sessions: AgentHistoryItem[] }
  | { type: 'agent.resumePrepared'; request: number; sessionId: string; directory: string; command: string; pane?: string }

export type AgentWebMessage =
  | { type: 'agent.respond'; pane: string; requestId: string; answer: AgentAnswer; message?: string; option?: string }
  | { type: 'agent.message'; pane: string; message: string }
  | { type: 'agent.prepareLaunch'; request: number; launchMode: AgentLaunchMode; shell: string }
  | { type: 'agent.prepareResume'; request: number; sessionId: string; pane?: string }

export interface AgentLaunchCommand {
  sessionId: string
  command: string
}
