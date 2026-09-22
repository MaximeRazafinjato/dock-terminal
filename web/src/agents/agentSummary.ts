import { AgentState, type PaneAgent } from '../bridge/messages'
import { folderName, panesOf, type Session, type Tab, type Workspace } from '../model/session'

export const AGENT_LABELS: Record<string, string> = { claude: 'Claude Code', codex: 'Codex CLI' }

export const STATE_LABELS: Record<AgentState, string> = {
  [AgentState.Working]: 'En cours',
  [AgentState.Waiting]: 'En attente',
  [AgentState.Done]: 'Terminé',
  [AgentState.Error]: 'En erreur',
  [AgentState.Unknown]: 'État inconnu',
}

export interface WaitingPane {
  paneId: string
  workspaceId: string
  tabId: string
  workspaceName: string
  tabName: string
  label: string
  detail: string
}

export type AgentMap = Record<string, PaneAgent>

export const agentLabel = (agent: PaneAgent): string => AGENT_LABELS[agent.agent] ?? agent.agent

export const describeAgent = (agent: PaneAgent): string => {
  const base = `${agentLabel(agent)} : ${STATE_LABELS[agent.state]}`
  return agent.message ? `${base} — ${agent.message}` : base
}

export const isWaiting = (agent: PaneAgent | undefined): boolean => agent?.state === AgentState.Waiting

export const isFailing = (agent: PaneAgent | undefined): boolean => agent?.state === AgentState.Error

export const tabWaitingCount = (tab: Tab, agents: AgentMap): number => panesOf(tab.tree).filter((pane) => isWaiting(agents[pane.id])).length

export const STATE_PRIORITY: AgentState[] = [AgentState.Waiting, AgentState.Error, AgentState.Working, AgentState.Unknown, AgentState.Done]

export type StateCounts = Partial<Record<AgentState, number>>

export const countStates = (panes: { id: string }[], agents: AgentMap): StateCounts => {
  const counts: StateCounts = {}
  for (const pane of panes) {
    const agent = agents[pane.id]
    if (agent) {
      counts[agent.state] = (counts[agent.state] ?? 0) + 1
    }
  }
  return counts
}

export const dominantState = (counts: StateCounts): AgentState | undefined => STATE_PRIORITY.find((state) => (counts[state] ?? 0) > 0)

export const tabAgents = (tab: Tab, agents: AgentMap): { state: AgentState; tip: string } | null => {
  const described = panesOf(tab.tree)
    .map((pane) => agents[pane.id])
    .filter((agent): agent is PaneAgent => agent !== undefined)
  const state = dominantState(countStates(panesOf(tab.tree), agents))
  return state ? { state, tip: described.map(describeAgent).join(' · ') } : null
}

export const workspaceStateCounts = (workspace: Workspace, agents: AgentMap): StateCounts =>
  countStates(
    workspace.tabs.flatMap((tab) => panesOf(tab.tree)),
    agents,
  )

export const stateCountLabel = (state: AgentState, count: number): string => (count === 1 ? STATE_LABELS[state] : `${count} × ${STATE_LABELS[state]}`)

export const workspaceWaitingCount = (workspace: Workspace, agents: AgentMap): number =>
  workspace.tabs.reduce((count, tab) => count + tabWaitingCount(tab, agents), 0)

export const waitingPanes = (session: Session, agents: AgentMap): WaitingPane[] =>
  session.workspaces.flatMap((workspace) =>
    workspace.tabs.flatMap((tab) =>
      panesOf(tab.tree)
        .filter((pane) => isWaiting(agents[pane.id]))
        .map((pane) => ({
          paneId: pane.id,
          workspaceId: workspace.id,
          tabId: tab.id,
          workspaceName: workspace.name,
          tabName: tab.name,
          label: `${workspace.name} › ${tab.name} › ${folderName(pane.path)}`,
          detail: describeAgent(agents[pane.id]),
        })),
    ),
  )

export const waitingSummary = (count: number): string => (count === 1 ? '1 terminal attend une réponse.' : `${count} terminaux attendent une réponse.`)
