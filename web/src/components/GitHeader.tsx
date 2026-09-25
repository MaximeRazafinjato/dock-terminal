import type { GitState } from '../bridge/gitMessages'
import { headSummary, plural } from '../git/gitLabels'
import { fetchRemote, pullBranch, pushBranch, refreshRepository, undoLastOperation } from '../git/gitRequests'
import { GitToolButton } from './GitToolButton'
import { Icon } from './Icon'
import { IconName } from './iconName'

interface GitHeaderProps {
  state: GitState
  busy: string | null
}

const undoTip = ({ undo }: GitState): string => {
  if (!undo) {
    return 'Aucune opération faite depuis Dock à annuler'
  }
  return undo.available ? `Annuler : ${undo.label}` : `Annulation impossible (${undo.reason ?? 'état inconnu'}) : ${undo.label}`
}

export function GitHeader({ state, busy }: GitHeaderProps) {
  const { head, remotes } = state
  const working = busy !== null
  const noRemote = remotes.length === 0
  const trackingTip = head.upstream ? `${plural(head.ahead, 'commit', 'commits')} à pousser, ${plural(head.behind, 'commit', 'commits')} à tirer depuis ${head.upstream}` : ''
  const pushTip = head.detached
    ? 'HEAD détachée : basculez sur une branche pour pousser'
    : head.upstream
      ? `Pousser vers ${head.upstream}`
      : noRemote
        ? 'Aucun dépôt distant configuré'
        : `Publier « ${head.branch ?? ''} » sur le dépôt distant`

  return (
    <div className="flex shrink-0 flex-col gap-[4px] px-[10px] pb-[6px]">
      <div className="flex min-w-0 items-center gap-[8px] pl-[2px] text-[12px]">
        <span className="min-w-0 shrink truncate font-semibold text-dock-ink" data-tip={state.root}>
          {state.name}
        </span>
        <span className="flex min-w-0 items-center gap-[4px] font-mono text-dock-green-deep">
          <Icon name={IconName.Branch} className="shrink-0" />
          <span className="truncate">{headSummary(head)}</span>
        </span>
        {head.upstream && (head.ahead > 0 || head.behind > 0) && (
          <span className="shrink-0 font-mono text-[11px] text-dock-muted" data-tip={trackingTip}>
            {`↑${head.ahead} ↓${head.behind}`}
          </span>
        )}
        {!head.upstream && head.branch && !head.unborn && (
          <span className="shrink-0 text-[11px] text-dock-muted" data-tip="Aucune branche distante suivie : Pousser la publie">
            non publiée
          </span>
        )}
      </div>
      <div className="flex items-center gap-[2px]">
        <GitToolButton icon={IconName.Fetch} label="Récupérer" tip={noRemote ? 'Aucun dépôt distant configuré' : 'Récupérer les branches distantes (git fetch --all)'} disabled={working || noRemote} onClick={fetchRemote} />
        <GitToolButton icon={IconName.Pull} label={head.behind > 0 ? `Tirer ${head.behind}` : 'Tirer'} tip={head.upstream ? `Tirer depuis ${head.upstream}` : 'Aucune branche distante suivie'} disabled={working || !head.upstream} onClick={pullBranch} />
        <GitToolButton icon={IconName.Push} label={head.ahead > 0 ? `Pousser ${head.ahead}` : 'Pousser'} tip={pushTip} disabled={working || head.detached || head.unborn || noRemote} onClick={pushBranch} />
        <span className="flex-1" />
        <GitToolButton icon={IconName.Undo} label="Annuler" tip={undoTip(state)} disabled={working || !state.undo?.available} onClick={undoLastOperation} />
        <GitToolButton icon={IconName.Refresh} tip="Actualiser" onClick={refreshRepository} />
      </div>
    </div>
  )
}
