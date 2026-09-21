import { create } from 'zustand'
import {
  activePane,
  activeTab,
  activeWorkspace,
  createTab,
  createWorkspace,
  panesOf,
  pruneNode,
  replaceNode,
  updatePane,
  SplitAxis,
  type Session,
  type SplitNode,
  type Tab,
  type Workspace,
} from '../model/session'

interface SessionState {
  session: Session | null
  load: (session: Session) => void
  selectWorkspace: (workspaceId: string) => void
  selectTab: (tabId: string) => void
  selectPane: (paneId: string) => void
  toggleWorkspace: (workspaceId: string) => void
  toggleSidebar: () => void
  newWorkspace: (name: string, path: string, shell: string) => void
  newTab: (shell: string) => void
  closeTab: (tabId: string) => void
  splitPane: (axis: SplitAxis) => void
  closePane: (paneId: string) => void
  setPanePath: (paneId: string, path: string) => void
}

const mutateSession = (session: Session | null, mutate: (draft: Session) => void): Session | null => {
  if (!session) {
    return session
  }
  const draft = structuredClone(session)
  mutate(draft)
  return draft
}

const mutateWorkspace = (session: Session | null, mutate: (workspace: Workspace, draft: Session) => void): Session | null =>
  mutateSession(session, (draft) => mutate(activeWorkspace(draft), draft))

const mutateTab = (session: Session | null, mutate: (tab: Tab, workspace: Workspace, draft: Session) => void): Session | null =>
  mutateWorkspace(session, (workspace, draft) => mutate(activeTab(workspace), workspace, draft))

export const useSessionStore = create<SessionState>()((set) => ({
  session: null,

  load: (session) => set({ session }),

  selectWorkspace: (workspaceId) =>
    set((state) => ({ session: mutateSession(state.session, (draft) => { draft.active = workspaceId }) })),

  selectTab: (tabId) =>
    set((state) => ({ session: mutateWorkspace(state.session, (workspace) => { workspace.active = tabId }) })),

  selectPane: (paneId) =>
    set((state) => ({
      session: mutateSession(state.session, (draft) => {
        for (const workspace of draft.workspaces) {
          for (const tab of workspace.tabs) {
            if (panesOf(tab.tree).some((pane) => pane.id === paneId)) {
              draft.active = workspace.id
              workspace.active = tab.id
              tab.active = paneId
            }
          }
        }
      }),
    })),

  toggleWorkspace: (workspaceId) =>
    set((state) => ({
      session: mutateSession(state.session, (draft) => {
        const workspace = draft.workspaces.find((candidate) => candidate.id === workspaceId)
        if (workspace) {
          workspace.expanded = !(workspace.expanded ?? workspace.id === draft.active)
        }
      }),
    })),

  toggleSidebar: () =>
    set((state) => ({ session: mutateSession(state.session, (draft) => { draft.sidebarCollapsed = !draft.sidebarCollapsed }) })),

  newWorkspace: (name, path, shell) =>
    set((state) => ({
      session: mutateSession(state.session, (draft) => {
        const workspace = createWorkspace(name, path, shell)
        draft.workspaces.push(workspace)
        draft.active = workspace.id
      }),
    })),

  newTab: (shell) =>
    set((state) => ({
      session: mutateWorkspace(state.session, (workspace) => {
        const tab = createTab(activePane(activeTab(workspace)).path, shell)
        workspace.tabs.push(tab)
        workspace.active = tab.id
      }),
    })),

  closeTab: (tabId) =>
    set((state) => ({
      session: mutateSession(state.session, (draft) => {
        const workspace = draft.workspaces.find((candidate) => candidate.tabs.some((tab) => tab.id === tabId))
        if (!workspace) {
          return
        }
        const index = workspace.tabs.findIndex((tab) => tab.id === tabId)
        const closedPane = activePane(workspace.tabs[index])
        workspace.tabs.splice(index, 1)
        if (workspace.tabs.length === 0) {
          if (draft.workspaces.length > 1) {
            draft.workspaces = draft.workspaces.filter((candidate) => candidate.id !== workspace.id)
            if (draft.active === workspace.id) {
              draft.active = draft.workspaces[0].id
            }
            return
          }
          workspace.tabs.push(createTab(closedPane.path, closedPane.shell))
        }
        if (workspace.active === tabId) {
          workspace.active = workspace.tabs[Math.min(index, workspace.tabs.length - 1)].id
        }
      }),
    })),

  splitPane: (axis) =>
    set((state) => ({
      session: mutateTab(state.session, (tab) => {
        const current = activePane(tab)
        const fresh = createTab(current.path, current.shell).tree as { pane: { id: string } }
        tab.tree = replaceNode(tab.tree, current.id, (leaf): SplitNode => ({ axis, ratio: 0.5, a: leaf, b: fresh as SplitNode }))
        tab.active = fresh.pane.id
      }),
    })),

  closePane: (paneId) =>
    set((state) => {
      const session = state.session
      if (!session) {
        return {}
      }
      const workspace = session.workspaces.find((candidate) => candidate.tabs.some((tab) => panesOf(tab.tree).some((pane) => pane.id === paneId)))
      const tab = workspace?.tabs.find((candidate) => panesOf(candidate.tree).some((pane) => pane.id === paneId))
      if (!workspace || !tab) {
        return {}
      }
      if (panesOf(tab.tree).length === 1) {
        state.closeTab(tab.id)
        return {}
      }
      return {
        session: mutateSession(session, (draft) => {
          const draftTab = draft.workspaces.find((candidate) => candidate.id === workspace.id)!.tabs.find((candidate) => candidate.id === tab.id)!
          draftTab.tree = pruneNode(draftTab.tree, paneId) ?? draftTab.tree
          if (draftTab.active === paneId) {
            draftTab.active = panesOf(draftTab.tree)[0].id
          }
        }),
      }
    }),

  setPanePath: (paneId, path) =>
    set((state) => ({
      session: mutateSession(state.session, (draft) => {
        for (const workspace of draft.workspaces) {
          for (const tab of workspace.tabs) {
            tab.tree = updatePane(tab.tree, paneId, { path })
          }
        }
      }),
    })),
}))
