import type { GitCommit } from '../bridge/gitMessages'

export interface GitCommitMenuRequest {
  commit: GitCommit
  x: number
  y: number
}

export interface GitCommitRowHandlers {
  select: (sha: string) => void
  openMenu: (request: GitCommitMenuRequest) => void
}

export const commitRowId = (sha: string): string => `git-commit-${sha}`
