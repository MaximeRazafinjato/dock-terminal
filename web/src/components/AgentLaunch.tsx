import { activePane, activeTab, activeWorkspace } from '../model/session'
import { useAgentLaunchStore } from '../store/agentLaunchStore'
import { useHostStore } from '../store/hostStore'
import { useSessionStore } from '../store/sessionStore'
import { AgentLaunchDialog } from './AgentLaunchDialog'

export function AgentLaunch() {
  const draft = useAgentLaunchStore((state) => state.draft)
  const projects = useHostStore((state) => state.projects)
  const activePath = useSessionStore((state) => {
    const workspace = state.session ? activeWorkspace(state.session) : undefined
    return workspace ? activePane(activeTab(workspace)).path : undefined
  })

  return draft ? <AgentLaunchDialog draft={draft} activePath={activePath} projects={projects} /> : null
}
