import { memo, type MouseEvent } from 'react'
import type { GitCommit } from '../bridge/gitMessages'
import { fullDate, relativeDate, shortSha } from '../git/gitLabels'
import { GitGraphCell, GRAPH_ROW_HEIGHT } from './GitGraphCell'
import { commitRowId, type GitCommitRowHandlers } from './gitHistoryRows'
import { GitRefLabels } from './GitRefLabels'

interface GitCommitRowProps {
  commit: GitCommit
  index: number
  selected: boolean
  active: boolean
  head: boolean
  handlers: GitCommitRowHandlers
}

export const GitCommitRow = memo(function GitCommitRow({ commit, index, selected, active, head, handlers }: GitCommitRowProps) {
  const handleClick = () => handlers.select(commit.sha)
  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault()
    handlers.openMenu({ commit, x: event.clientX, y: event.clientY })
  }
  const tone = selected ? 'bg-dock-green-soft text-dock-green-deep' : 'text-dock-ink-soft hover:bg-dock-green-hover hover:text-dock-ink'

  return (
    <div
      id={commitRowId(commit.sha)}
      role="option"
      aria-selected={selected}
      className={`absolute inset-x-0 flex cursor-pointer items-center gap-[6px] pr-[8px] pl-[4px] text-[12px] select-none ${tone} ${active ? 'group-focus-visible:outline-2 group-focus-visible:-outline-offset-2 group-focus-visible:outline-dock-focus' : ''}`}
      style={{ top: index * GRAPH_ROW_HEIGHT, height: GRAPH_ROW_HEIGHT }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      <GitGraphCell graph={commit.graph} head={head} />
      <GitRefLabels refs={commit.refs} />
      <span className={`min-w-0 flex-1 truncate ${head ? 'font-semibold' : ''}`} data-tip={`${shortSha(commit.sha)} · ${commit.author} · ${fullDate(commit.date)}`}>
        {commit.subject}
      </span>
      <span className="shrink-0 text-[11px] text-dock-muted @max-[300px]:hidden">{relativeDate(commit.date)}</span>
    </div>
  )
})
