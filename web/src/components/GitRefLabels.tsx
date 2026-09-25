import { GitRefKind, type GitRefLabel } from '../bridge/gitMessages'

interface GitRefLabelsProps {
  refs: GitRefLabel[]
}

const MAX_LABELS = 2

const LABEL_CLASSES: Record<GitRefKind, string> = {
  [GitRefKind.Head]: 'border-dock-warning/50 text-dock-warning',
  [GitRefKind.Branch]: 'border-dock-line text-dock-ink',
  [GitRefKind.Remote]: 'border-dashed border-dock-line text-dock-muted',
  [GitRefKind.Tag]: 'border-dock-warning/40 text-dock-warning',
}

const LABEL_TIPS: Record<GitRefKind, string> = {
  [GitRefKind.Head]: 'HEAD détachée',
  [GitRefKind.Branch]: 'Branche locale',
  [GitRefKind.Remote]: 'Branche distante',
  [GitRefKind.Tag]: 'Tag',
}

const CURRENT_CLASS = 'border-dock-green bg-dock-green-soft font-semibold text-dock-green-deep'

export function GitRefLabels({ refs }: GitRefLabelsProps) {
  if (refs.length === 0) {
    return null
  }
  const hidden = refs.slice(MAX_LABELS)

  return (
    <span className="flex max-w-[55%] shrink-0 items-center gap-[3px] overflow-hidden">
      {refs.slice(0, MAX_LABELS).map((label) => (
        <span
          key={`${label.kind}\n${label.name}`}
          className={`min-w-0 truncate rounded border px-[4px] text-[10.5px] leading-[15px] ${label.current ? CURRENT_CLASS : LABEL_CLASSES[label.kind]}`}
          data-tip={`${label.current ? 'Branche courante' : LABEL_TIPS[label.kind]} : ${label.name}`}
        >
          {label.name}
        </span>
      ))}
      {hidden.length > 0 && (
        <span className="shrink-0 text-[10.5px] text-dock-muted" data-tip={hidden.map((label) => label.name).join(', ')}>
          {`+${hidden.length}`}
        </span>
      )}
    </span>
  )
}
