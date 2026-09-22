import { create } from 'zustand'
import type { PaneAgent } from '../bridge/messages'

export const agentKey = (agent: PaneAgent): string => `${agent.state}|${agent.message ?? ''}`

interface AgentStoreState {
  agents: Record<string, PaneAgent>
  acknowledged: Record<string, string>
  setAgents: (panes: PaneAgent[]) => void
  acknowledge: (paneId: string) => void
}

export const useAgentStore = create<AgentStoreState>()((set) => ({
  agents: {},
  acknowledged: {},
  setAgents: (panes) =>
    set((state) => {
      const agents = Object.fromEntries(panes.map((agent) => [agent.paneId, agent]))
      const acknowledged = Object.fromEntries(Object.entries(state.acknowledged).filter(([paneId, key]) => agents[paneId] !== undefined && agentKey(agents[paneId]) === key))
      return { agents, acknowledged }
    }),
  acknowledge: (paneId) =>
    set((state) => {
      const agent = state.agents[paneId]
      return agent ? { acknowledged: { ...state.acknowledged, [paneId]: agentKey(agent) } } : state
    }),
}))
