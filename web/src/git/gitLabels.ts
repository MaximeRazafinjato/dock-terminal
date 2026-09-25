import { GitChangeKind, GitConflictKind, GitOperationKind, type GitHead } from '../bridge/gitMessages'

export const CHANGE_LETTERS: Record<GitChangeKind, string> = {
  [GitChangeKind.Modified]: 'M',
  [GitChangeKind.Added]: 'A',
  [GitChangeKind.Deleted]: 'D',
  [GitChangeKind.Renamed]: 'R',
  [GitChangeKind.Copied]: 'C',
  [GitChangeKind.TypeChanged]: 'T',
  [GitChangeKind.Untracked]: 'U',
}

export const CHANGE_LABELS: Record<GitChangeKind, string> = {
  [GitChangeKind.Modified]: 'Modifié',
  [GitChangeKind.Added]: 'Ajouté',
  [GitChangeKind.Deleted]: 'Supprimé',
  [GitChangeKind.Renamed]: 'Renommé',
  [GitChangeKind.Copied]: 'Copié',
  [GitChangeKind.TypeChanged]: 'Type modifié',
  [GitChangeKind.Untracked]: 'Non suivi',
}

export const CHANGE_CLASSES: Record<GitChangeKind, string> = {
  [GitChangeKind.Modified]: 'text-dock-warning',
  [GitChangeKind.Added]: 'text-dock-green',
  [GitChangeKind.Deleted]: 'text-dock-error',
  [GitChangeKind.Renamed]: 'text-dock-lane-1',
  [GitChangeKind.Copied]: 'text-dock-lane-1',
  [GitChangeKind.TypeChanged]: 'text-dock-lane-3',
  [GitChangeKind.Untracked]: 'text-dock-green',
}

export const CONFLICT_LABELS: Record<GitConflictKind, string> = {
  [GitConflictKind.BothModified]: 'Modifié des deux côtés',
  [GitConflictKind.BothAdded]: 'Ajouté des deux côtés',
  [GitConflictKind.BothDeleted]: 'Supprimé des deux côtés',
  [GitConflictKind.AddedByUs]: 'Ajouté de notre côté',
  [GitConflictKind.AddedByThem]: 'Ajouté de leur côté',
  [GitConflictKind.DeletedByUs]: 'Supprimé de notre côté',
  [GitConflictKind.DeletedByThem]: 'Supprimé de leur côté',
}

export const OPERATION_LABELS: Record<GitOperationKind, string> = {
  [GitOperationKind.Merge]: 'Fusion',
  [GitOperationKind.Rebase]: 'Rebase',
  [GitOperationKind.CherryPick]: 'Cherry-pick',
  [GitOperationKind.Revert]: 'Revert',
}

const SECONDS_PER_DAY = 86400
const RELATIVE_DAYS = 7
const relativeFormat = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' })
const RELATIVE_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['second', 60],
  ['minute', 60],
  ['hour', 24],
  ['day', RELATIVE_DAYS],
]

export const shortSha = (sha: string | undefined): string => (sha ?? '').slice(0, 7)

export const fileName = (path: string): string => path.slice(path.lastIndexOf('/') + 1)

export const fileFolder = (path: string): string => path.slice(0, Math.max(path.lastIndexOf('/'), 0))

export const plural = (count: number, singular: string, several: string): string => `${count} ${count > 1 ? several : singular}`

export const currentName = (head: GitHead): string => head.branch ?? 'HEAD'

export const headSummary = (head: GitHead): string => {
  if (head.detached) {
    return `HEAD détachée sur ${shortSha(head.sha)}`
  }
  return head.unborn ? `${head.branch ?? 'main'} · aucun commit` : (head.branch ?? 'HEAD')
}

export const relativeDate = (unixSeconds: number): string => {
  const now = Date.now() / 1000
  let delta = unixSeconds - now
  if (Math.abs(delta) >= SECONDS_PER_DAY * RELATIVE_DAYS) {
    const date = new Date(unixSeconds * 1000)
    const sameYear = date.getFullYear() === new Date().getFullYear()
    return date.toLocaleDateString('fr-FR', sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' })
  }
  for (const [unit, size] of RELATIVE_STEPS) {
    if (Math.abs(delta) < size) {
      return relativeFormat.format(Math.round(delta), unit)
    }
    delta /= size
  }
  return relativeFormat.format(Math.round(delta), 'week')
}

export const fullDate = (unixSeconds: number): string => new Date(unixSeconds * 1000).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })

export const absolutePath = (root: string, path: string): string => `${root.replace(/[\\/]+$/, '')}\\${path.replaceAll('/', '\\')}`
