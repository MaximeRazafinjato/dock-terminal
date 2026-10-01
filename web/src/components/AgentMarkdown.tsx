import { useMemo, type MouseEvent } from 'react'
import { bridge } from '../bridge/bridge'
import { renderMarkdown } from '../preview/renderPreview'

interface AgentMarkdownProps {
  content: string
}

const WEB_LINK = /^https?:\/\//i

const handleClick = (event: MouseEvent<HTMLDivElement>) => {
  const link = event.target instanceof Element ? event.target.closest('a') : null
  if (!link) {
    return
  }
  event.preventDefault()
  const href = link.getAttribute('href') ?? ''
  if (WEB_LINK.test(href)) {
    bridge.send({ type: 'link.open', url: href })
  }
}

export function AgentMarkdown({ content }: AgentMarkdownProps) {
  const html = useMemo(() => renderMarkdown(content, ''), [content])
  return <div className="tily-markdown tily-markdown-compact" onClick={handleClick} dangerouslySetInnerHTML={{ __html: html }} />
}
