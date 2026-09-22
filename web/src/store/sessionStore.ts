import { create } from 'zustand'
import {
  activePane,
  activeTab,
  activeWorkspace,
  CLOSED_TABS_MAX,
  cloneTabWithNewIds,
  createPane,
  createTab,
  createWorkspace,
  findWorkspace,
  folderName,
  panesOf,
  pruneNode,
  setRatioAt,
  splitLeaf,
  updatePane,
  SIDEBAR_MAX,
  SIDEBAR_MIN,
  SplitAxis,
  type ClosedTab,
  type Session,
  type SplitPath,
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
  setSidebarWidth: (width: number) => void
  newWorkspace: (name: string, path: string, shell: string) => string
  renameWorkspace: (workspaceId: string, name: string) => void
  newTab: (shell: string) => void
  renameTab: (tabId: string, name: string) => void
  moveTab: (tabId: string, targetWorkspaceId: string, beforeTabId?: string) => void
  moveActiveTab: (offset: number) => void
  closeTab: (tabId: string, text?: Record<string, string>) => void
  restoreTab: () => { tab: Tab; text: Record<string, string> } | null
  splitPane: (axis: SplitAxis) => void
  setSplitRatio: (tabId: string, path: SplitPath, ratio: number) => void
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
  mutateSession(session, (draft) => {
    const workspace = activeWorkspace(draft)
    if (workspace) {
      mutate(workspace, draft)
    }
  })

const mutateTab = (session: Session | null, mutate: (tab: Tab, workspace: Workspace, draft: Session) => void): Session | null =>
  mutateWorkspace(session, (workspace, draft) => mutate(activeTab(workspace), workspace, draft))

export const useSessionStore = create<SessionState>()((set, get) => ({
  session: null,

  load: (session) => set({ session: { ...session, closed: session.closed ?? [] } }),

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

  setSidebarWidth: (width) =>
    set((state) => ({
      session: mutateSession(state.session, (draft) => { draft.sidebar = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Math.round(width))) }),
    })),

  newWorkspace: (name, path, shell) => {
    const workspace = createWorkspace(name, path, shell)
    set((state) => ({
      session: mutateSession(state.session, (draft) => {
        draft.workspaces.push(workspace)
        draft.active = workspace.id
      }),
    }))
    return workspace.id
  },

  renameWorkspace: (workspaceId, name) =>
    set((state) => ({
      session: mutateSession(state.session, (draft) => {
        const workspace = findWorkspace(draft, workspaceId)
        const trimmed = name.trim()
        if (workspace && trimmed.length > 0) {
          workspace.name = trimmed
        }
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

  renameTab: (tabId, name) =>
    set((state) => ({
      session: mutateSession(state.session, (draft) => {
        const tab = draft.workspaces.flatMap((workspace) => workspace.tabs).find((candidate) => candidate.id === tabId)
        const trimmed = name.trim()
        if (tab && trimmed.length > 0) {
          tab.name = trimmed
          tab.manual = true
        }
      }),
    })),

  moveTab: (tabId, targetWorkspaceId, beforeTabId) =>
    set((state) => ({
      session: mutateSession(state.session, (draft) => {
        const source = draft.workspaces.find((candidate) => candidate.tabs.some((tab) => tab.id === tabId))
        const target = findWorkspace(draft, targetWorkspaceId)
        if (!source || !target || tabId === beforeTabId) {
          return
        }
        const [tab] = source.tabs.splice(source.tabs.findIndex((candidate) => candidate.id === tabId), 1)
        if (source.tabs.length === 0 && source !== target) {
          draft.workspaces = draft.workspaces.filter((candidate) => candidate !== source)
        } else if (source.active === tabId && source !== target) {
          source.active = source.tabs[0].id
        }
        const index = beforeTabId ? target.tabs.findIndex((candidate) => candidate.id === beforeTabId) : -1
        target.tabs.splice(index < 0 ? target.tabs.length : index, 0, tab)
        target.active = tab.id
        draft.active = target.id
      }),
    })),

  moveActiveTab: (offset) =>
    set((state) => ({
      session: mutateWorkspace(state.session, (workspace) => {
        const index = workspace.tabs.findIndex((tab) => tab.id === workspace.active)
        const destination = index + offset
        if (destination < 0 || destination >= workspace.tabs.length) {
          return
        }
        const [tab] = workspace.tabs.splice(index, 1)
        workspace.tabs.splice(destination, 0, tab)
      }),
    })),

  closeTab: (tabId, text = {}) =>
    set((state) => ({
      session: mutateSession(state.session, (draft) => {
        const workspace = draft.workspaces.find((candidate) => candidate.tabs.some((tab) => tab.id === tabId))
        if (!workspace) {
          return
        }
        const index = workspace.tabs.findIndex((tab) => tab.id === tabId)
        const [tab] = workspace.tabs.splice(index, 1)
        const closed: ClosedTab = { workspaceId: workspace.id, workspaceName: workspace.name, index, tab, text }
        draft.closed = [...draft.closed, closed].slice(-CLOSED_TABS_MAX)
        if (workspace.tabs.length === 0) {
          draft.workspaces = draft.workspaces.filter((candidate) => candidate.id !== workspace.id)
          if (draft.active === workspace.id) {
            draft.active = draft.workspaces[0]?.id ?? ''
          }
          return
        }
        if (workspace.active === tabId) {
          workspace.active = workspace.tabs[Math.min(index, workspace.tabs.length - 1)].id
        }
      }),
    })),

  restoreTab: () => {
    const entry = get().session?.closed.at(-1)
    if (!entry) {
      return null
    }
    const { tab, paneIds } = cloneTabWithNewIds(entry.tab)
    const text = Object.fromEntries(Object.entries(entry.text).flatMap(([paneId, content]) => (paneIds[paneId] ? [[paneIds[paneId], content]] : [])))
    set((state) => ({
      session: mutateSession(state.session, (draft) => {
        draft.closed = draft.closed.slice(0, -1)
        let workspace = findWorkspace(draft, entry.workspaceId)
        if (!workspace) {
          workspace = { id: entry.workspaceId, name: entry.workspaceName, tabs: [], active: tab.id, expanded: true }
          draft.workspaces.push(workspace)
        }
        workspace.tabs.splice(Math.min(entry.index, workspace.tabs.length), 0, tab)
        workspace.active = tab.id
        draft.active = workspace.id
      }),
    }))
    return { tab, text }
  },

  splitPane: (axis) =>
    set((state) => ({
      session: mutateTab(state.session, (tab) => {
        const current = activePane(tab)
        const fresh = createPane(current.path, current.shell)
        tab.tree = splitLeaf(tab.tree, current.id, axis, fresh)
        tab.active = fresh.id
      }),
    })),

  setSplitRatio: (tabId, path, ratio) =>
    set((state) => ({
      session: mutateSession(state.session, (draft) => {
        const tab = draft.workspaces.flatMap((workspace) => workspace.tabs).find((candidate) => candidate.id === tabId)
        if (tab) {
          tab.tree = setRatioAt(tab.tree, path, ratio)
        }
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
            if (!tab.manual && tab.active === paneId) {
              tab.name = folderName(path) || tab.name
            }
          }
        }
      }),
    })),
}))
