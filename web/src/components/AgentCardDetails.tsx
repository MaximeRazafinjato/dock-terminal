import { contextLabel } from '../agents/agentSummary'
import type { AgentCard, AgentFileChange } from '../bridge/agentMessages'
import { bridge } from '../bridge/bridge'
import { AgentState } from '../bridge/messages'
import { useHostStore } from '../store/hostStore'
import { AgentFollowUp } from './AgentFollowUp'
import { AgentRequestActions } from './AgentRequestActions'
import { LazyAgentMarkdown } from './LazyAgentMarkdown'

interface AgentCardDetailsProps {
  card: AgentCard
  onOpenFile: (path: string) => void
}

const SECTION_LABEL = 'text-[10.5px] font-semibold tracking-[0.06em] text-tily-muted uppercase'

export function AgentCardDetails({ card, onOpenFile }: AgentCardDetailsProps) {
  const hooksOutdated = useHostStore((state) => state.hooksOutdated)
  const pullRequest = card.pullRequest
  const handleOpenPullRequest = () => {
    if (pullRequest) {
      bridge.send({ type: 'link.open', url: pullRequest.url })
    }
  }
  const renderFile = (file: AgentFileChange) => {
    const handleOpen = () => onOpenFile(file.path)
    return (
      <li key={file.path}>
        <button type="button" className="flex w-full cursor-pointer items-center gap-[6px] rounded px-[4px] py-[1px] text-left hover:bg-tily-panel" data-tip={`${file.path} · voir le diff dans la vue Git`} onClick={handleOpen}>
          <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-tily-ink-soft">{file.name}</span>
          <span className="shrink-0 font-mono text-[11px] text-tily-diff-added-ink">+{file.added}</span>
          <span className="shrink-0 font-mono text-[11px] text-tily-diff-removed-ink">−{file.removed}</span>
        </button>
      </li>
    )
  }

  return (
    <div className="flex flex-col gap-[8px] pr-[8px] pb-[8px] pl-[24px] text-[12px]">
      {card.state === AgentState.Waiting && card.detail && (
        <div className="flex flex-col gap-[2px] rounded border border-tily-status-waiting/50 px-[8px] py-[5px]">
          <p className="text-tily-status-waiting">{card.message ?? 'Réponse attendue'}</p>
          <p className="font-mono text-[11.5px] [overflow-wrap:anywhere] whitespace-pre-wrap text-tily-ink">{card.detail}</p>
        </div>
      )}
      {card.state === AgentState.Waiting && card.request && <AgentRequestActions paneId={card.paneId} request={card.request} />}
      {card.state === AgentState.Waiting && !card.request && (
        <p className="text-[11.5px] text-tily-muted">
          {hooksOutdated ? 'Cette demande se règle dans le terminal (↗) : pour y répondre d’ici, mettez à jour les hooks dans Paramètres (Leader puis ,).' : 'Cette demande se règle dans le terminal (↗).'}
        </p>
      )}
      {card.action && card.state !== AgentState.Waiting && (
        <p className="break-words text-tily-ink-soft">
          <span className={SECTION_LABEL}>Action en cours </span>
          <span className="font-mono text-[11.5px]">{card.action.target ? `${card.action.tool} : ${card.action.target}` : card.action.tool}</span>
        </p>
      )}
      {card.lastMessage && (
        <section className="flex flex-col gap-[4px]">
          <h4 className={SECTION_LABEL}>Dernier message</h4>
          <div className="max-h-[360px] overflow-auto rounded bg-tily-panel px-[8px] py-[6px] text-tily-ink">
            <LazyAgentMarkdown content={card.lastMessage} />
          </div>
        </section>
      )}
      {card.files.length > 0 && (
        <section className="flex flex-col gap-[2px]">
          <h4 className={SECTION_LABEL}>Fichiers modifiés · {card.files.length}</h4>
          <ul className="flex flex-col">{card.files.map(renderFile)}</ul>
        </section>
      )}
      {(card.context || pullRequest) && (
        <p className="flex flex-wrap items-center gap-x-[10px] gap-y-[2px] text-[11.5px] text-tily-muted">
          {card.context && <span>{contextLabel(card.context)}</span>}
          {pullRequest && (
            <button type="button" className="cursor-pointer text-tily-lane-1 underline underline-offset-2 hover:text-tily-ink" data-tip={pullRequest.url} onClick={handleOpenPullRequest}>
              {pullRequest.number ? `Pull request #${pullRequest.number}` : 'Pull request'}
            </button>
          )}
        </p>
      )}
      {card.agent === 'claude' && card.state !== AgentState.Waiting && <AgentFollowUp paneId={card.paneId} />}
    </div>
  )
}
