import { openAgentLaunch } from '../agents/agentLaunch'
import { AgentState } from '../bridge/messages'
import { SidebarView, type Session } from '../model/session'
import { useAgentStore } from '../store/agentStore'
import { useSessionStore } from '../store/sessionStore'
import { WorktreePickerKind } from '../store/worktreeStore'
import { openWorktreePicker } from '../worktree/worktreeActions'
import { AgentsView } from './AgentsView'
import { Icon } from './Icon'
import { IconName } from './iconName'
import type { WorkspacePanelActions } from './workspacePanel'
import { WorkspaceTree } from './WorkspaceTree'

interface LeftPanelProps {
  session: Session
  renamingWorkspaceId: string | null
  renamingTabId: string | null
  actions: WorkspacePanelActions
}

const HEADER_BUTTON = 'flex size-[24px] cursor-pointer items-center justify-center rounded-md text-tily-muted hover:bg-tily-green-hover hover:text-tily-ink'
const VIEW_TAB = 'flex cursor-pointer items-center gap-[5px] rounded-md px-[8px] py-[3px] text-[11px] font-semibold tracking-[0.06em] uppercase'
const VIEW_TAB_SELECTED = 'bg-tily-green-soft text-tily-green-deep'
const VIEW_TAB_IDLE = 'text-tily-muted hover:bg-tily-green-hover hover:text-tily-ink'

const handleCreateWorktree = (): void => openWorktreePicker(WorktreePickerKind.Source)
const handleShowWorkspaces = (): void => useSessionStore.getState().setSidebarView(SidebarView.Workspaces)
const handleShowAgents = (): void => useSessionStore.getState().setSidebarView(SidebarView.Agents)

const countWaiting = (agents: Record<string, { state: AgentState }>): number => Object.values(agents).filter((agent) => agent.state === AgentState.Waiting).length

export function LeftPanel({ session, renamingWorkspaceId, renamingTabId, actions }: LeftPanelProps) {
  const waiting = useAgentStore((state) => countWaiting(state.agents))
  const agentsShown = session.sidebarView === SidebarView.Agents

  return (
    <aside data-left-panel="" aria-label="Panneau de gauche" className="@container flex h-full min-h-0 flex-col bg-tily-paper" style={{ width: session.sidebar }}>
      <div className="flex h-[36px] shrink-0 items-center gap-[2px] pr-[6px] pl-[6px]">
        <div role="tablist" aria-label="Vue du panneau de gauche" className="flex flex-1 items-center gap-[2px]">
          <button type="button" role="tab" aria-selected={!agentsShown} className={`${VIEW_TAB} ${agentsShown ? VIEW_TAB_IDLE : VIEW_TAB_SELECTED}`} data-tip="Workspaces et onglets (Ctrl + Maj + I pour basculer)" onClick={handleShowWorkspaces}>
            Workspaces
          </button>
          <button type="button" role="tab" aria-selected={agentsShown} className={`${VIEW_TAB} ${agentsShown ? VIEW_TAB_SELECTED : VIEW_TAB_IDLE}`} data-tip="Agents de tous les workspaces (Ctrl + Maj + I)" onClick={handleShowAgents}>
            Agents
            {waiting > 0 && (
              <span aria-label={`${waiting} en attente`} className="rounded-full bg-tily-status-waiting px-[5px] text-[10px] leading-[15px] font-bold tracking-normal text-tily-terminal">
                {waiting}
              </span>
            )}
          </button>
        </div>
        {agentsShown && (
          <button type="button" className={HEADER_BUTTON} aria-label="Nouvel agent" data-tip="Lancer Claude Code sur une tâche" onClick={openAgentLaunch}>
            <Icon name={IconName.Plus} />
          </button>
        )}
        {!agentsShown && (
          <>
            <button type="button" className={HEADER_BUTTON} aria-label="Ouvrir un projet" data-tip="Ouvrir un projet (Leader puis F)" onClick={actions.openProjects}>
              <Icon name={IconName.Project} />
            </button>
            <button type="button" className={HEADER_BUTTON} aria-label="Créer un worktree" data-tip="Créer un worktree depuis un projet (Leader puis N)" onClick={handleCreateWorktree}>
              <Icon name={IconName.Worktree} />
            </button>
            <button type="button" className={HEADER_BUTTON} aria-label="Nouveau workspace" data-tip="Nouveau workspace (Ctrl + Maj + W)" onClick={actions.newWorkspace}>
              <Icon name={IconName.Plus} />
            </button>
          </>
        )}
      </div>
      {agentsShown ? <AgentsView session={session} /> : <WorkspaceTree session={session} renamingWorkspaceId={renamingWorkspaceId} renamingTabId={renamingTabId} actions={actions} />}
    </aside>
  )
}
