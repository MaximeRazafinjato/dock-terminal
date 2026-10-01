import { useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { sendAgentMessage } from '../agents/agentResponses'
import { GIT_INPUT, GIT_SECONDARY } from './rightPanelStyles'

interface AgentFollowUpProps {
  paneId: string
}

export function AgentFollowUp({ paneId }: AgentFollowUpProps) {
  const [message, setMessage] = useState('')
  const empty = message.trim().length === 0

  const handleSend = () => {
    if (!empty) {
      sendAgentMessage(paneId, message)
      setMessage('')
    }
  }
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => setMessage(event.target.value)
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex items-end gap-[6px]">
      <textarea
        rows={2}
        className={`${GIT_INPUT} min-h-[44px] resize-y`}
        placeholder="Message à Claude Code…"
        aria-label="Message à Claude Code"
        data-tip="Entrée envoie · Maj + Entrée va à la ligne"
        value={message}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      <button type="button" className={GIT_SECONDARY} aria-disabled={empty} data-tip="Collé dans le champ de Claude puis envoyé ; mis en file s’il travaille" onClick={handleSend}>
        Envoyer
      </button>
    </div>
  )
}
