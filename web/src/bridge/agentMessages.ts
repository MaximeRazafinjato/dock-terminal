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
}

export type AgentHostMessage = { type: 'agent.board'; cards: AgentCard[] }
