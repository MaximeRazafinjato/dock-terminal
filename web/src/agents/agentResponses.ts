import type { AgentAnswer } from '../bridge/agentMessages'
import { bridge } from '../bridge/bridge'
import { StatusLevel, useHostStore } from '../store/hostStore'
import { terminalRegistry } from '../terminal/terminalRegistry'
import { pasteAndSubmit } from './launchTasks'

interface AnswerDetails {
  message?: string
  option?: string
}

export const respondToAgent = (paneId: string, requestId: string, answer: AgentAnswer, details: AnswerDetails = {}): void =>
  bridge.send({ type: 'agent.respond', pane: paneId, requestId, answer, ...details })

export const sendAgentMessage = (paneId: string, message: string): void => bridge.send({ type: 'agent.message', pane: paneId, message })

export const receiveAgentResponded = (): void => useHostStore.getState().setStatus('Réponse envoyée à Claude Code.')

export const receiveAgentSend = (paneId: string, text: string): void => {
  const terminal = terminalRegistry.get(paneId)?.terminal
  if (!terminal) {
    useHostStore.getState().setStatus('Terminal de l’agent introuvable : message non envoyé.', StatusLevel.Error)
    return
  }
  pasteAndSubmit(paneId, terminal, text)
  useHostStore.getState().setStatus('Message envoyé à Claude Code.')
}
