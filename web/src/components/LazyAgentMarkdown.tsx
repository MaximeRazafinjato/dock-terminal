import { lazy, Suspense } from 'react'

interface LazyAgentMarkdownProps {
  content: string
}

const AgentMarkdown = lazy(() => import('./AgentMarkdown').then((module) => ({ default: module.AgentMarkdown })))

export function LazyAgentMarkdown({ content }: LazyAgentMarkdownProps) {
  return (
    <Suspense fallback={<p className="text-[12px] break-words whitespace-pre-wrap">{content}</p>}>
      <AgentMarkdown content={content} />
    </Suspense>
  )
}
