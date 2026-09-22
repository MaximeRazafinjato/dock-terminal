import { bridge } from '../bridge/bridge'
import { agentKey, useAgentStore } from '../store/agentStore'
import { useSessionStore } from '../store/sessionStore'
import { waitingPanes } from './agentSummary'

const seen: Record<string, string> = {}

export const startAttentionNotifier = (): (() => void) =>
  useAgentStore.subscribe((state) => {
    const { session } = useSessionStore.getState()
    if (!session) {
      return
    }
    const fresh = waitingPanes(session, state.agents).filter((pane) => {
      const key = agentKey(state.agents[pane.paneId])
      const isNew = seen[pane.paneId] !== key && state.acknowledged[pane.paneId] !== key
      seen[pane.paneId] = key
      return isNew
    })
    for (const pane of fresh) {
      bridge.send({ type: 'attention.raise', pane: pane.paneId, title: `${pane.workspaceName} › ${pane.tabName}`, body: pane.detail })
    }
  })
