import { create } from 'zustand'
import type { AgentCard, AgentHistoryItem } from '../bridge/agentMessages'
import type { PaneAgent } from '../bridge/messages'

export const agentKey = (agent: PaneAgent): string => `${agent.state}|${agent.message ?? ''}`

interface AgentStoreState {
  agents: Record<string, PaneAgent>
  acknowledged: Record<string, string>
  since: Record<string, number>
  cards: AgentCard[]
  history: AgentHistoryItem[]
  setAgents: (panes: PaneAgent[]) => void
  setCards: (cards: AgentCard[]) => void
  setHistory: (history: AgentHistoryItem[]) => void
  acknowledge: (paneId: string) => void
}

export const useAgentStore = create<AgentStoreState>()((set) => ({
  agents: {},
  acknowledged: {},
  since: {},
  cards: [],
  history: [],
  setCards: (cards) => set((state) => ({ cards, since: { ...state.since, ...Object.fromEntries(cards.map((card) => [card.paneId, card.since])) } })),
  setHistory: (history) => set({ history }),
  setAgents: (panes) =>
    set((state) => {
      const agents = Object.fromEntries(panes.map((agent) => [agent.paneId, agent]))
      const acknowledged = Object.fromEntries(Object.entries(state.acknowledged).filter(([paneId, key]) => agents[paneId] !== undefined && agentKey(agents[paneId]) === key))
      const now = Date.now()
      const since = Object.fromEntries(
        panes.map((agent) => {
          const previous = state.agents[agent.paneId]
          return [agent.paneId, previous && agentKey(previous) === agentKey(agent) ? (state.since[agent.paneId] ?? now) : now]
        }),
      )
      return { agents, acknowledged, since }
    }),
  acknowledge: (paneId) =>
    set((state) => {
      const agent = state.agents[paneId]
      return agent ? { acknowledged: { ...state.acknowledged, [paneId]: agentKey(agent) } } : state
    }),
}))
