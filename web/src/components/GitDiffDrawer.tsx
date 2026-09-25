import type { KeyboardEvent } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { GitChangeKind, GitDiffSource, type GitFileChange } from '../bridge/gitMessages'
import { focusGitPanel } from '../git/gitFocus'
import { shortSha } from '../git/gitLabels'
import { closeDrawer, discardChanges, openInEditor, stageChanges, unstageChanges } from '../git/gitRequests'
import { useGitStore, type GitFileTarget } from '../store/gitStore'
import { GitCommitSummary } from './GitCommitSummary'
import { GitDiffView } from './GitDiffView'
import { GitToolButton } from './GitToolButton'
import { Icon } from './Icon'
import { IconName } from './iconName'
import { PANEL_HEADER_BUTTON } from './rightPanelStyles'

const SOURCE_LABELS: Record<GitDiffSource, string> = {
  [GitDiffSource.Unstaged]: 'Non indexé',
  [GitDiffSource.Staged]: 'Indexé',
  [GitDiffSource.Commit]: 'Commit',
}

const asChange = (file: GitFileTarget): GitFileChange => ({ path: file.path, oldPath: file.oldPath, kind: file.untracked ? GitChangeKind.Untracked : GitChangeKind.Modified })

const handleClose = () => {
  closeDrawer()
  focusGitPanel()
}

const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    handleClose()
  }
}

export function GitDiffDrawer() {
  const { file, commit, diff, diffError, details, detailsError } = useGitStore(
    useShallow((store) => ({ file: store.file, commit: store.commit, diff: store.diff, diffError: store.diffError, details: store.details, detailsError: store.detailsError })),
  )
  if (!file && !commit) {
    return null
  }
  const working = file && !commit ? file : null
  const title = commit ? (details?.message.split('\n')[0] ?? shortSha(commit)) : (file?.path ?? '')
  const context = commit ? `Commit ${shortSha(commit)}` : working?.untracked ? 'Non suivi' : SOURCE_LABELS[working?.source ?? GitDiffSource.Unstaged]
  const handleEdit = () => working && openInEditor(working.path)
  const handleStage = () => working && stageChanges([asChange(working)])
  const handleUnstage = () => working && unstageChanges([asChange(working)])
  const handleDiscard = () => working && discardChanges([asChange(working)], 1)

  return (
    <aside aria-label={commit ? 'Détail du commit' : 'Diff du fichier'} data-git-drawer="" className="absolute inset-y-0 right-0 z-20 flex w-[min(920px,100%)] flex-col border-l border-dock-line bg-dock-panel shadow-2xl" onKeyDown={handleKeyDown}>
      <header className="flex h-[36px] shrink-0 items-center gap-[8px] border-b border-dock-line pr-[6px] pl-[12px]">
        <span className="shrink-0 rounded bg-dock-paper px-[6px] py-[1px] text-[11px] text-dock-muted">{context}</span>
        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-dock-ink" data-tip={title}>
          {title}
        </span>
        {working && (
          <span className="flex shrink-0 items-center gap-[2px]">
            <GitToolButton icon={IconName.Editor} tip="Ouvrir dans l’éditeur" onClick={handleEdit} />
            {working.source === GitDiffSource.Staged ? (
              <GitToolButton icon={IconName.Minus} tip="Retirer de l’index" onClick={handleUnstage} />
            ) : (
              <>
                <GitToolButton icon={IconName.Discard} tip="Abandonner les modifications" onClick={handleDiscard} />
                <GitToolButton icon={IconName.Plus} tip="Indexer" onClick={handleStage} />
              </>
            )}
          </span>
        )}
        <button type="button" className={PANEL_HEADER_BUTTON} aria-label="Fermer" data-tip="Fermer (Échap)" onClick={handleClose}>
          <Icon name={IconName.Close} />
        </button>
      </header>
      {commit && <GitCommitSummary details={details} error={detailsError} selected={file} />}
      <GitDiffView key={file ? `${file.source}\n${file.path}\n${file.commit ?? ''}` : 'aucun'} diff={file ? diff : null} error={file ? diffError : null} placeholder={file ? 'Chargement du diff…' : 'Choisissez un fichier pour voir ses modifications.'} />
    </aside>
  )
}
