import { useEffect, type KeyboardEvent } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { focusActivePane } from '../explorer/fileExplorerActions'
import { closeDrawer, followRepository } from '../git/gitRequests'
import { RightPanelView } from '../model/session'
import { togglePanelView } from '../panel/rightPanel'
import { GitTab, useGitStore } from '../store/gitStore'
import { GitBanners } from './GitBanners'
import { GitBranchesView } from './GitBranchesView'
import { GitChangesView } from './GitChangesView'
import { GitHeader } from './GitHeader'
import { GitHistoryView } from './GitHistoryView'
import { GitPromptBar } from './GitPromptBar'

interface GitPanelProps {
  folder: string
}

const TABS: { tab: GitTab; label: string }[] = [
  { tab: GitTab.Changes, label: 'Modifications' },
  { tab: GitTab.History, label: 'Historique' },
  { tab: GitTab.Branches, label: 'Branches' },
]

const handleEscape = (): void => {
  const store = useGitStore.getState()
  if (store.file || store.commit) {
    store.closeDrawer()
  } else if (store.prompt) {
    store.setPrompt(null)
  } else {
    focusActivePane()
  }
}

const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
  const key = event.key.toLowerCase()
  if (event.ctrlKey && event.shiftKey && key === 'g') {
    togglePanelView(RightPanelView.Git, true)
  } else if (event.ctrlKey && event.shiftKey && key === 'e') {
    togglePanelView(RightPanelView.Files, true)
  } else if (event.key === 'Escape') {
    handleEscape()
  } else {
    return
  }
  event.preventDefault()
  event.stopPropagation()
}

export function GitPanel({ folder }: GitPanelProps) {
  const { state, error, resolved, tab, prompt, busy } = useGitStore(
    useShallow((store) => ({ state: store.state, error: store.error, resolved: store.resolved, tab: store.tab, prompt: store.prompt, busy: store.busy })),
  )

  useEffect(() => {
    followRepository(folder)
  }, [folder])
  useEffect(
    () => () => {
      followRepository('')
      closeDrawer()
    },
    [],
  )

  const changeCount = state ? state.stagedTotal + state.unstagedTotal + state.conflicts.length : 0

  const renderTabs = () =>
    TABS.map((entry) => {
      const selected = entry.tab === tab
      const handleSelect = () => useGitStore.getState().setTab(entry.tab)
      return (
        <button
          key={entry.tab}
          type="button"
          role="tab"
          aria-selected={selected}
          className={`flex cursor-pointer items-center gap-[5px] rounded-md px-[8px] py-[3px] text-[12px] ${selected ? 'bg-dock-green-soft text-dock-green-deep' : 'text-dock-muted hover:bg-dock-green-hover hover:text-dock-ink'}`}
          onClick={handleSelect}
        >
          {entry.label}
          {entry.tab === GitTab.Changes && changeCount > 0 && <span className="rounded-full bg-dock-panel px-[5px] text-[10.5px] leading-[15px] text-dock-muted">{changeCount}</span>}
        </button>
      )
    })

  const renderContent = () => {
    if (!state) {
      const loading = resolved !== folder
      return (
        <div className="flex flex-col gap-[6px] px-[12px] py-[8px] text-[12px]">
          <p className="text-dock-ink">{loading ? 'Lecture du dépôt Git…' : 'Aucun dépôt Git'}</p>
          {!loading && <p className="break-all text-dock-muted">{error ?? `Le dossier du pane actif n’appartient à aucun dépôt : ${folder}`}</p>}
        </div>
      )
    }
    return (
      <>
        <GitHeader state={state} busy={busy} />
        <GitBanners state={state} busy={busy} />
        {prompt && <GitPromptBar key={`${prompt.kind}\n${prompt.target ?? ''}`} prompt={prompt} />}
        <div role="tablist" aria-label="Vues Git" className="flex shrink-0 items-center gap-[2px] border-b border-dock-line px-[8px] pb-[5px]">
          {renderTabs()}
        </div>
        {tab === GitTab.Changes && <GitChangesView state={state} busy={busy} />}
        {tab === GitTab.History && <GitHistoryView state={state} />}
        {tab === GitTab.Branches && <GitBranchesView state={state} />}
      </>
    )
  }

  return (
    <section aria-label="Git" data-git-panel="" tabIndex={-1} className="@container relative flex min-h-0 flex-1 flex-col focus:outline-none" onKeyDown={handleKeyDown}>
      {busy && <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] animate-pulse bg-dock-green" />}
      {renderContent()}
    </section>
  )
}
