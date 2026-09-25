import { create } from 'zustand'
import { GitHistoryScope, type GitCommitDetails, type GitDiff, type GitDiffSource, type GitHistory, type GitState } from '../bridge/gitMessages'

export enum GitTab {
  Changes = 'changes',
  History = 'history',
  Branches = 'branches',
}

export enum GitPromptKind {
  NewBranch = 'newBranch',
  RenameBranch = 'renameBranch',
  NewTag = 'newTag',
  Stash = 'stash',
}

export interface GitFileTarget {
  source: GitDiffSource
  path: string
  oldPath?: string
  untracked: boolean
  commit?: string
}

export interface GitFailure {
  message: string
  output?: string
}

export interface GitRejection {
  branch: string
  message: string
  output: string
}

export interface GitConfirmation {
  title: string
  body: string
  detail?: string
  confirmLabel: string
  run: () => void
}

export interface GitPrompt {
  kind: GitPromptKind
  label: string
  initial: string
  target?: string
  checkout: boolean
}

export const HISTORY_PAGE = 200

interface GitViewState {
  path: string
  resolved: string
  state: GitState | null
  error: string | null
  tab: GitTab
  history: GitHistory | null
  historyError: string | null
  scope: GitHistoryScope
  historyCount: number
  file: GitFileTarget | null
  commit: string | null
  diffRequest: number
  diff: GitDiff | null
  diffError: string | null
  detailsRequest: number
  details: GitCommitDetails | null
  detailsError: string | null
  busy: string | null
  failure: GitFailure | null
  rejection: GitRejection | null
  confirmation: GitConfirmation | null
  prompt: GitPrompt | null
  message: string
  amend: boolean
  follow: (path: string) => void
  receiveState: (path: string, state: GitState | null, error: string | null) => void
  setTab: (tab: GitTab) => void
  receiveHistory: (history: GitHistory, error: string | null) => void
  requestHistory: (scope: GitHistoryScope, count: number) => void
  showFile: (file: GitFileTarget, request: number) => void
  showCommit: (commit: string, request: number) => void
  closeDrawer: () => void
  receiveDiff: (request: number, diff: GitDiff | null, error: string | null) => void
  receiveDetails: (request: number, details: GitCommitDetails | null, error: string | null) => void
  setBusy: (busy: string | null) => void
  setFailure: (failure: GitFailure | null) => void
  setRejection: (rejection: GitRejection | null) => void
  confirm: (confirmation: GitConfirmation | null) => void
  setPrompt: (prompt: GitPrompt | null) => void
  setMessage: (message: string) => void
  setAmend: (amend: boolean, message: string) => void
}

const closedDrawer = { file: null, commit: null, diff: null, diffError: null, details: null, detailsError: null }

export const useGitStore = create<GitViewState>()((set) => ({
  path: '',
  resolved: '',
  state: null,
  error: null,
  tab: GitTab.Changes,
  history: null,
  historyError: null,
  scope: GitHistoryScope.All,
  historyCount: HISTORY_PAGE,
  ...closedDrawer,
  diffRequest: 0,
  detailsRequest: 0,
  busy: null,
  failure: null,
  rejection: null,
  confirmation: null,
  prompt: null,
  message: '',
  amend: false,
  follow: (path) => set({ path }),
  receiveState: (path, state, error) =>
    set((current) => {
      if (current.path !== path) {
        return current
      }
      const sameRepository = Boolean(state && current.state?.root === state.root)
      return sameRepository
        ? { state, error, resolved: path }
        : { state, error, resolved: path, history: null, historyError: null, historyCount: HISTORY_PAGE, message: '', amend: false, prompt: null, rejection: null, failure: null, ...closedDrawer }
    }),
  setTab: (tab) => set({ tab }),
  receiveHistory: (history, historyError) => set((current) => (current.state?.root === history.root ? { history, historyError } : current)),
  requestHistory: (scope, historyCount) => set({ scope, historyCount }),
  showFile: (file, diffRequest) =>
    set((current) => {
      const same = current.file?.path === file.path && current.file.source === file.source && current.file.commit === file.commit
      return { file, diffRequest, diff: same ? current.diff : null, diffError: null, commit: file.commit ? current.commit : null }
    }),
  showCommit: (commit, detailsRequest) => set({ ...closedDrawer, commit, detailsRequest }),
  closeDrawer: () => set(closedDrawer),
  receiveDiff: (request, diff, diffError) => set((current) => (current.diffRequest === request ? { diff, diffError } : current)),
  receiveDetails: (request, details, detailsError) => set((current) => (current.detailsRequest === request ? { details, detailsError } : current)),
  setBusy: (busy) => set({ busy }),
  setFailure: (failure) => set({ failure }),
  setRejection: (rejection) => set({ rejection }),
  confirm: (confirmation) => set({ confirmation }),
  setPrompt: (prompt) => set({ prompt }),
  setMessage: (message) => set({ message }),
  setAmend: (amend, message) => set({ amend, message }),
}))
