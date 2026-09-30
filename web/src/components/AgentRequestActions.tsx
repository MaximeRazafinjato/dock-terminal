import { useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { respondToAgent } from '../agents/agentResponses'
import { AgentAnswer, AgentRequestKind, type AgentQuestionOption, type AgentRequest } from '../bridge/agentMessages'
import { GIT_DANGER, GIT_INPUT, GIT_PRIMARY, GIT_SECONDARY } from './rightPanelStyles'

interface AgentRequestActionsProps {
  paneId: string
  request: AgentRequest
}

export function AgentRequestActions({ paneId, request }: AgentRequestActionsProps) {
  const [sentFor, setSentFor] = useState<string | null>(null)
  const [reason, setReason] = useState<string | null>(null)
  const sent = sentFor === request.id

  const answer = (kind: AgentAnswer, details?: { message?: string; option?: string }) => {
    setSentFor(request.id)
    respondToAgent(paneId, request.id, kind, details)
  }
  const handleAllow = () => answer(AgentAnswer.Allow)
  const handleAlways = () => answer(AgentAnswer.Always)
  const handleStartDeny = () => setReason('')
  const handleCancelDeny = () => setReason(null)
  const handleDeny = () => answer(AgentAnswer.Deny, { message: reason ?? undefined })
  const handleReasonChange = (event: ChangeEvent<HTMLInputElement>) => setReason(event.target.value)
  const handleReasonKeys = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleDeny()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      handleCancelDeny()
    }
  }
  const renderOption = (option: AgentQuestionOption) => {
    const handleChoose = () => answer(AgentAnswer.Option, { option: option.label })
    return (
      <button key={option.label} type="button" className={GIT_SECONDARY} aria-disabled={sent} data-tip={option.description} onClick={sent ? undefined : handleChoose}>
        {option.label}
      </button>
    )
  }

  if (request.kind === AgentRequestKind.Question) {
    return request.answerable ? (
      <div className="flex flex-wrap gap-[6px]">{request.questions[0].options.map(renderOption)}</div>
    ) : (
      <p className="text-[11.5px] text-tily-muted">Question à plusieurs réponses : répondez dans le terminal.</p>
    )
  }

  if (reason !== null) {
    return (
      <div className="flex flex-col gap-[6px]">
        <input autoFocus type="text" className={GIT_INPUT} placeholder="Raison transmise à Claude (facultative)" aria-label="Raison du refus" value={reason} onChange={handleReasonChange} onKeyDown={handleReasonKeys} />
        <div className="flex flex-wrap gap-[6px]">
          <button type="button" className={GIT_DANGER} aria-disabled={sent} onClick={sent ? undefined : handleDeny}>
            Refuser
          </button>
          <button type="button" className={GIT_SECONDARY} onClick={handleCancelDeny}>
            Annuler
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[6px]">
      <div className="flex flex-wrap gap-[6px]">
        <button type="button" className={GIT_PRIMARY} aria-disabled={sent} onClick={sent ? undefined : handleAllow}>
          Autoriser
        </button>
        <button type="button" className={GIT_SECONDARY} aria-disabled={sent} data-tip="Refuser, avec une raison facultative : Claude poursuit son tour" onClick={sent ? undefined : handleStartDeny}>
          Refuser…
        </button>
      </div>
      {request.rule && (
        <button type="button" className={`${GIT_SECONDARY} max-w-full truncate text-left`} aria-disabled={sent} data-tip={`Autoriser et ne plus demander : ${request.rule}`} onClick={sent ? undefined : handleAlways}>
          Toujours · {request.rule}
        </button>
      )}
    </div>
  )
}
