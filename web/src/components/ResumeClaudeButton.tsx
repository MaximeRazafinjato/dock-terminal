import { resumeSession } from '../agents/agentHistory'
import type { AgentHistoryItem } from '../bridge/agentMessages'

interface ResumeClaudeButtonProps {
  paneId: string
  item: AgentHistoryItem
}

export function ResumeClaudeButton({ paneId, item }: ResumeClaudeButtonProps) {
  const handleResume = () => resumeSession(item.sessionId, paneId)

  return (
    <button
      type="button"
      className="mr-1 shrink-0 cursor-pointer rounded border border-tily-green px-1.5 py-px text-[10px] leading-tight font-medium text-tily-green-deep hover:bg-tily-green-soft aria-disabled:cursor-default aria-disabled:opacity-40"
      aria-disabled={!item.resumable}
      data-tip={item.reason ?? `Reprendre « ${item.title ?? 'session Claude Code'} » (claude --resume)`}
      onClick={item.resumable ? handleResume : undefined}
    >
      Reprendre Claude
    </button>
  )
}
