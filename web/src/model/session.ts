export enum SplitAxis {
  Horizontal = 'x',
  Vertical = 'y',
}

export interface Pane {
  id: string
  path: string
  shell: string
}

export interface SplitLeaf {
  pane: Pane
}

export interface SplitBranch {
  axis: SplitAxis
  ratio: number
  a: SplitNode
  b: SplitNode
}

export type SplitNode = SplitLeaf | SplitBranch

export enum SplitSide {
  A = 'a',
  B = 'b',
}

export type SplitPath = SplitSide[]

export interface Tab {
  id: string
  name: string
  manual: boolean
  active: string
  tree: SplitNode
}

export interface Workspace {
  id: string
  name: string
  tabs: Tab[]
  active: string
  expanded?: boolean
}

export interface ClosedTab {
  workspaceId: string
  workspaceName: string
  index: number
  tab: Tab
  text: Record<string, string>
}

export interface Session {
  version: number
  workspaces: Workspace[]
  active: string
  sidebar: number
  sidebarCollapsed: boolean
  closed: ClosedTab[]
  favorites: string[]
}

export const SESSION_VERSION = 2
export const SIDEBAR_MIN = 220
export const SIDEBAR_MAX = 450
export const SIDEBAR_DEFAULT = 292
export const DEFAULT_SHELL = 'powershell'
export const CLOSED_TABS_MAX = 5
export const SPLIT_RATIO_MIN = 0.15
export const SPLIT_RATIO_MAX = 0.85
export const SPLIT_RATIO_DEFAULT = 0.5

export const clampRatio = (ratio: number): number => Math.min(SPLIT_RATIO_MAX, Math.max(SPLIT_RATIO_MIN, ratio))

export const isLeaf = (node: SplitNode): node is SplitLeaf => 'pane' in node

export const newId = (): string => crypto.randomUUID().replace(/-/g, '')

export const folderName = (path: string): string => {
  const trimmed = path.replace(/[\\/]+$/, '')
  const segment = trimmed.split(/[\\/]/).pop()
  return segment && segment.length > 0 ? segment : trimmed
}

export const createPane = (path: string, shell: string): Pane => ({ id: newId(), path, shell })

export const createTab = (path: string, shell: string): Tab => {
  const pane = createPane(path, shell)
  return { id: newId(), name: folderName(path) || shell, manual: false, active: pane.id, tree: { pane } }
}

export const createWorkspace = (name: string, path: string, shell: string): Workspace => {
  const tab = createTab(path, shell)
  return { id: newId(), name, tabs: [tab], active: tab.id, expanded: true }
}

export const panesOf = (node: SplitNode): Pane[] => (isLeaf(node) ? [node.pane] : [...panesOf(node.a), ...panesOf(node.b)])

export const replaceNode = (node: SplitNode, paneId: string, replacement: (leaf: SplitLeaf) => SplitNode): SplitNode => {
  if (isLeaf(node)) {
    return node.pane.id === paneId ? replacement(node) : node
  }
  return { ...node, a: replaceNode(node.a, paneId, replacement), b: replaceNode(node.b, paneId, replacement) }
}

export const pruneNode = (node: SplitNode, paneId: string): SplitNode | null => {
  if (isLeaf(node)) {
    return node.pane.id === paneId ? null : node
  }
  const a = pruneNode(node.a, paneId)
  const b = pruneNode(node.b, paneId)
  if (a && b) {
    return { ...node, a, b }
  }
  return a ?? b
}

export const updatePane = (node: SplitNode, paneId: string, patch: Partial<Pane>): SplitNode =>
  replaceNode(node, paneId, (leaf) => ({ pane: { ...leaf.pane, ...patch } }))

export const splitLeaf = (node: SplitNode, paneId: string, axis: SplitAxis, pane: Pane): SplitNode =>
  replaceNode(node, paneId, (leaf): SplitNode => ({ axis, ratio: SPLIT_RATIO_DEFAULT, a: leaf, b: { pane } }))

export const setRatioAt = (node: SplitNode, path: SplitPath, ratio: number): SplitNode => {
  if (isLeaf(node)) {
    return node
  }
  const [side, ...rest] = path
  if (side === undefined) {
    return { ...node, ratio: clampRatio(ratio) }
  }
  return { ...node, [side]: setRatioAt(node[side], rest, ratio) }
}

const renewPaneIds = (node: SplitNode, paneIds: Record<string, string>): SplitNode => {
  if (isLeaf(node)) {
    const id = newId()
    paneIds[node.pane.id] = id
    return { pane: { ...node.pane, id } }
  }
  return { ...node, a: renewPaneIds(node.a, paneIds), b: renewPaneIds(node.b, paneIds) }
}

export const cloneTabWithNewIds = (tab: Tab): { tab: Tab; paneIds: Record<string, string> } => {
  const paneIds: Record<string, string> = {}
  const tree = renewPaneIds(tab.tree, paneIds)
  return { tab: { ...tab, id: newId(), tree, active: paneIds[tab.active] ?? panesOf(tree)[0].id }, paneIds }
}

export const findWorkspace = (session: Session, workspaceId: string): Workspace | undefined =>
  session.workspaces.find((workspace) => workspace.id === workspaceId)

export const activeWorkspace = (session: Session): Workspace | undefined =>
  findWorkspace(session, session.active) ?? session.workspaces[0]

export const activeTab = (workspace: Workspace): Tab =>
  workspace.tabs.find((tab) => tab.id === workspace.active) ?? workspace.tabs[0]

export const activePane = (tab: Tab): Pane => panesOf(tab.tree).find((pane) => pane.id === tab.active) ?? panesOf(tab.tree)[0]

export const allPanes = (session: Session): Pane[] =>
  session.workspaces.flatMap((workspace) => workspace.tabs.flatMap((tab) => panesOf(tab.tree)))
