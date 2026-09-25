import type { GitCommitDetails, GitFileChange } from '../bridge/gitMessages'
import { CHANGE_CLASSES, CHANGE_LABELS, CHANGE_LETTERS, fileFolder, fileName, fullDate, plural, shortSha } from '../git/gitLabels'
import { copyToClipboard, showCommitFile } from '../git/gitRequests'
import type { GitFileTarget } from '../store/gitStore'

interface GitCommitSummaryProps {
  details: GitCommitDetails | null
  error: string | null
  selected: GitFileTarget | null
}

const bodyOf = (message: string): string => message.split('\n').slice(1).join('\n').trim()

export function GitCommitSummary({ details, error, selected }: GitCommitSummaryProps) {
  if (!details) {
    return <p className={`shrink-0 border-b border-dock-line px-[12px] py-[10px] text-[12px] ${error ? 'text-dock-error' : 'text-dock-muted italic'}`}>{error ?? 'Lecture du commit…'}</p>
  }
  const body = bodyOf(details.message)
  const handleCopySha = () => copyToClipboard(details.sha, `SHA copié : ${shortSha(details.sha)}`)
  const renderFile = (change: GitFileChange) => {
    const isSelected = selected?.path === change.path
    const handleSelect = () => showCommitFile(details.sha, change)
    return (
      <button
        key={change.path}
        type="button"
        role="option"
        aria-selected={isSelected}
        className={`flex h-[22px] w-full shrink-0 cursor-pointer items-center gap-[6px] px-[12px] text-left text-[12px] ${isSelected ? 'bg-dock-green-soft text-dock-green-deep' : 'text-dock-ink-soft hover:bg-dock-green-hover hover:text-dock-ink'}`}
        onClick={handleSelect}
      >
        <span className={`w-[12px] shrink-0 text-center font-mono text-[11px] font-semibold ${CHANGE_CLASSES[change.kind]}`} data-tip={change.oldPath ? `${CHANGE_LABELS[change.kind]} depuis ${change.oldPath}` : CHANGE_LABELS[change.kind]}>
          {CHANGE_LETTERS[change.kind]}
        </span>
        <span className="min-w-0 shrink truncate">{fileName(change.path)}</span>
        <span className="min-w-0 flex-1 truncate text-[11px] text-dock-muted">{fileFolder(change.path)}</span>
      </button>
    )
  }

  return (
    <div className="flex max-h-[45%] min-h-0 shrink-0 flex-col border-b border-dock-line">
      <div className="flex shrink-0 flex-col gap-[4px] px-[12px] py-[8px]">
        <div className="flex flex-wrap items-center gap-x-[12px] gap-y-[2px] text-[11px] text-dock-muted">
          <button type="button" className="cursor-pointer font-mono text-dock-green-deep hover:underline" data-tip="Copier le SHA" onClick={handleCopySha}>
            {details.sha.slice(0, 12)}
          </button>
          <span data-tip={details.email}>{details.author}</span>
          <span>{fullDate(details.date)}</span>
          {details.parents.length > 1 && <span>{`Fusion de ${details.parents.map(shortSha).join(' et ')}`}</span>}
          <span>{plural(details.files.length, 'fichier modifié', 'fichiers modifiés')}</span>
        </div>
        {body && <pre className="max-h-[96px] overflow-auto font-sans text-[12px] whitespace-pre-wrap text-dock-ink-soft">{body}</pre>}
      </div>
      <div role="listbox" aria-label="Fichiers du commit" className="min-h-0 flex-1 overflow-auto pb-[4px]">
        {details.files.map(renderFile)}
      </div>
    </div>
  )
}
