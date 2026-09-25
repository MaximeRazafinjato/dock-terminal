import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { GitHistoryScope, type GitState } from '../bridge/gitMessages'
import { plural, shortSha } from '../git/gitLabels'
import { commitMenu } from '../git/gitMenus'
import { loadMoreHistory, setHistoryScope, showCommit } from '../git/gitRequests'
import { useGitStore } from '../store/gitStore'
import { GitCommitRow } from './GitCommitRow'
import { GitContextMenu } from './GitContextMenu'
import { GRAPH_ROW_HEIGHT } from './GitGraphCell'
import { commitRowId, type GitCommitMenuRequest, type GitCommitRowHandlers } from './gitHistoryRows'
import { useVirtualRows } from './useVirtualRows'
import { isMenuKey } from './workspacePanel'

interface GitHistoryViewProps {
  state: GitState
}

const SCOPES: { scope: GitHistoryScope; label: string; tip: string }[] = [
  { scope: GitHistoryScope.All, label: 'Toutes', tip: 'Branches locales, branches distantes et tags' },
  { scope: GitHistoryScope.Current, label: 'Courante', tip: 'Branche courante et sa branche distante suivie' },
]

export function GitHistoryView({ state }: GitHistoryViewProps) {
  const { history, historyError, scope, commit } = useGitStore(useShallow((store) => ({ history: store.history, historyError: store.historyError, scope: store.scope, commit: store.commit })))
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeSha, setActiveSha] = useState<string | null>(null)
  const [menu, setMenu] = useState<GitCommitMenuRequest | null>(null)
  const commits = useMemo(() => history?.commits ?? [], [history])
  const hasMore = Boolean(history?.hasMore)
  const rowCount = commits.length + (hasMore ? 1 : 0)
  const { range, handleScroll } = useVirtualRows(containerRef, rowCount, GRAPH_ROW_HEIGHT)
  const activeIndex = Math.max(0, commits.findIndex((candidate) => candidate.sha === (activeSha ?? commit)))
  const active = commits.at(activeIndex)

  useEffect(() => {
    if (hasMore && range.end >= commits.length) {
      loadMoreHistory()
    }
  }, [hasMore, range.end, commits.length])

  const handlers: GitCommitRowHandlers = useMemo(
    () => ({
      select: (sha) => {
        setActiveSha(sha)
        showCommit(sha)
      },
      openMenu: setMenu,
    }),
    [],
  )
  const handleDismissMenu = useCallback(() => {
    setMenu(null)
    containerRef.current?.focus()
  }, [])

  const scrollToIndex = (index: number) => {
    const container = containerRef.current
    if (!container) {
      return
    }
    const top = index * GRAPH_ROW_HEIGHT
    if (top < container.scrollTop) {
      container.scrollTop = top
    } else if (top + GRAPH_ROW_HEIGHT > container.scrollTop + container.clientHeight) {
      container.scrollTop = top + GRAPH_ROW_HEIGHT - container.clientHeight
    }
  }
  const moveTo = (index: number) => {
    const target = commits[Math.min(Math.max(index, 0), commits.length - 1)]
    if (!target) {
      return
    }
    setActiveSha(target.sha)
    scrollToIndex(commits.indexOf(target))
    if (useGitStore.getState().commit) {
      showCommit(target.sha)
    }
  }
  const openMenuAtActive = () => {
    if (!active) {
      return
    }
    const rect = document.getElementById(commitRowId(active.sha))?.getBoundingClientRect()
    setMenu({ commit: active, x: rect ? rect.left + GRAPH_ROW_HEIGHT : 0, y: rect ? rect.bottom : 0 })
  }
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const page = Math.max(1, Math.floor((containerRef.current?.clientHeight ?? GRAPH_ROW_HEIGHT) / GRAPH_ROW_HEIGHT) - 1)
    const moves: Record<string, number> = { ArrowDown: activeIndex + 1, ArrowUp: activeIndex - 1, PageDown: activeIndex + page, PageUp: activeIndex - page, Home: 0, End: commits.length - 1 }
    if (event.key in moves) {
      moveTo(moves[event.key])
    } else if (event.key === 'Enter' && active) {
      handlers.select(active.sha)
    } else if (isMenuKey(event)) {
      openMenuAtActive()
    } else {
      return
    }
    event.preventDefault()
    event.stopPropagation()
  }
  const countLabel = history ? `${plural(commits.length, 'commit', 'commits')}${hasMore ? ' chargés' : ''}` : 'Chargement de l’historique…'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-[30px] shrink-0 items-center gap-[6px] pr-[8px] pl-[12px]">
        <span className="min-w-0 flex-1 truncate text-[11px] text-dock-muted">{countLabel}</span>
        <div role="radiogroup" aria-label="Branches affichées" className="flex shrink-0 rounded-md bg-dock-panel p-[2px]">
          {SCOPES.map((entry) => {
            const handleScope = () => setHistoryScope(entry.scope)
            return (
              <button
                key={entry.scope}
                type="button"
                role="radio"
                aria-checked={entry.scope === scope}
                data-tip={entry.tip}
                className={`cursor-pointer rounded px-[7px] py-[1px] text-[11px] ${entry.scope === scope ? 'bg-dock-green-soft text-dock-green-deep' : 'text-dock-muted hover:text-dock-ink'}`}
                onClick={handleScope}
              >
                {entry.label}
              </button>
            )
          })}
        </div>
      </div>
      {historyError && <p className="px-[12px] py-[4px] text-[12px] text-dock-error">{historyError}</p>}
      {history && commits.length === 0 && !historyError && <p className="px-[12px] py-[4px] text-[12px] text-dock-muted italic">Aucun commit pour l’instant.</p>}
      <div
        ref={containerRef}
        role="listbox"
        tabIndex={0}
        aria-label="Historique des commits"
        aria-activedescendant={active ? commitRowId(active.sha) : undefined}
        className="group relative min-h-0 flex-1 overflow-auto focus:outline-none"
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
      >
        <div className="relative" style={{ height: rowCount * GRAPH_ROW_HEIGHT }}>
          {commits.slice(range.start, range.end).map((entry, offset) => (
            <GitCommitRow
              key={entry.sha}
              commit={entry}
              index={range.start + offset}
              selected={entry.sha === commit}
              active={entry.sha === active?.sha}
              head={entry.sha === state.head.sha}
              handlers={handlers}
            />
          ))}
          {hasMore && range.end >= commits.length && (
            <div className="absolute inset-x-0 flex items-center px-[12px] text-[11px] text-dock-muted italic" style={{ top: commits.length * GRAPH_ROW_HEIGHT, height: GRAPH_ROW_HEIGHT }}>
              Chargement des commits suivants…
            </div>
          )}
        </div>
      </div>
      {menu && <GitContextMenu x={menu.x} y={menu.y} label={`Actions du commit ${shortSha(menu.commit.sha)}`} items={commitMenu(menu.commit, state)} onDismiss={handleDismissMenu} />}
    </div>
  )
}
