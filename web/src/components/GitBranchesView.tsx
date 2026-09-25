import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { GitBranch, GitRemoteBranch, GitState, GitStash, GitTag } from '../bridge/gitMessages'
import { focusGitRow } from '../git/gitFocus'
import { shortSha } from '../git/gitLabels'
import { branchMenu, remoteBranchMenu, stashMenu, tagMenu } from '../git/gitMenus'
import { promptNewBranch, promptNewTag, promptStash, switchToBranch, switchToRemote } from '../git/gitRefActions'
import { showCommit } from '../git/gitRequests'
import type { ActionMenuItem } from './ActionMenu'
import { GitContextMenu } from './GitContextMenu'
import { GitRefRow } from './GitRefRow'
import { GitSection } from './GitSection'
import { Icon } from './Icon'
import { IconName } from './iconName'
import { ROW_ACTION } from './rightPanelStyles'

interface GitBranchesViewProps {
  state: GitState
}

interface MenuRequest {
  x: number
  y: number
  label: string
  items: ActionMenuItem[]
}

const LOCAL = 'local'
const REMOTE = 'remote'
const TAGS = 'tags'
const STASHES = 'stashes'
const ROW_SELECTOR = '[data-git-row]'

const localKey = (branch: GitBranch) => `${LOCAL}\n${branch.name}`
const remoteKey = (branch: GitRemoteBranch) => `${REMOTE}\n${branch.name}`
const groupKey = (remote: string) => `${REMOTE}:${remote}`

const branchMeta = (branch: GitBranch): string | undefined => {
  if (branch.gone) {
    return 'supprimée'
  }
  return branch.ahead > 0 || branch.behind > 0 ? `↑${branch.ahead} ↓${branch.behind}` : undefined
}

const branchTip = (branch: GitBranch): string => {
  if (branch.gone) {
    return `${branch.name} : la branche distante suivie ${branch.upstream ?? ''} a été supprimée`
  }
  return branch.upstream ? `${branch.name} · suit ${branch.upstream}` : `${branch.name} · aucune branche distante suivie`
}

export function GitBranchesView({ state }: GitBranchesViewProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [focusKey, setFocusKey] = useState<string | null>(null)
  const [menu, setMenu] = useState<MenuRequest | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const groups = useMemo(
    () => state.remotes.map((remote) => ({ remote, branches: state.remoteBranches.filter((branch) => branch.remote === remote) })),
    [state.remotes, state.remoteBranches],
  )
  const keys = [
    ...(collapsed[LOCAL] ? [] : state.branches.map(localKey)),
    ...(collapsed[REMOTE] ? [] : groups.flatMap((group) => (collapsed[groupKey(group.remote)] ? [] : group.branches.map(remoteKey)))),
    ...(collapsed[TAGS] ? [] : state.tags.map((tag) => `${TAGS}\n${tag.name}`)),
    ...(collapsed[STASHES] ? [] : state.stashes.map((stash) => `${STASHES}\n${stash.sha}`)),
  ]
  const focusable = keys.find((key) => key === focusKey) ?? keys[0]
  const clean = state.stagedTotal + state.unstagedTotal === 0

  const toggle = (section: string) => () => setCollapsed((current) => ({ ...current, [section]: !current[section] }))
  const openMenu = (label: string, items: ActionMenuItem[]) => (x: number, y: number) => setMenu({ x, y, label, items })
  const handleDismissMenu = useCallback(() => {
    setMenu(null)
    requestAnimationFrame(() => {
      if (document.activeElement === document.body && focusKey) {
        focusGitRow(focusKey)
      }
    })
  }, [focusKey])
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const rows = Array.from(containerRef.current?.querySelectorAll<HTMLElement>(ROW_SELECTOR) ?? [])
    const index = rows.indexOf(event.target as HTMLElement)
    const moves: Record<string, number> = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: rows.length - 1 }
    if (!(event.key in moves) || index < 0) {
      return
    }
    event.preventDefault()
    const target = rows[Math.min(Math.max(moves[event.key], 0), rows.length - 1)]
    setFocusKey(target?.dataset.gitRow ?? null)
    target?.focus()
  }
  const handleNewBranch = () => promptNewBranch()
  const handleNewTag = () => promptNewTag()

  const renderBranch = (branch: GitBranch) => {
    const key = localKey(branch)
    const handleActivate = () => {
      if (!branch.current) {
        switchToBranch(branch)
      }
    }
    return (
      <GitRefRow
        key={key}
        rowKey={key}
        icon={IconName.Branch}
        name={branch.name}
        meta={branchMeta(branch)}
        metaTip={branch.upstream ? `↑ à pousser, ↓ à tirer depuis ${branch.upstream}` : undefined}
        tip={branchTip(branch)}
        current={branch.current}
        focusable={key === focusable}
        onFocus={setFocusKey}
        onActivate={handleActivate}
        onMenu={openMenu(`Actions de ${branch.name}`, branchMenu(branch, state))}
      />
    )
  }
  const renderRemoteBranch = (branch: GitRemoteBranch) => {
    const key = remoteKey(branch)
    const handleActivate = () => switchToRemote(branch)
    return (
      <GitRefRow
        key={key}
        rowKey={key}
        icon={IconName.Branch}
        name={branch.branch}
        tip={`${branch.name} · double-clic pour basculer sur une branche locale qui la suit`}
        indent
        focusable={key === focusable}
        onFocus={setFocusKey}
        onActivate={handleActivate}
        onMenu={openMenu(`Actions de ${branch.name}`, remoteBranchMenu(branch, state))}
      />
    )
  }
  const renderTag = (tag: GitTag) => {
    const key = `${TAGS}\n${tag.name}`
    const handleShow = () => showCommit(tag.sha)
    return (
      <GitRefRow
        key={key}
        rowKey={key}
        icon={IconName.Tag}
        name={tag.name}
        meta={shortSha(tag.sha)}
        tip={`Tag ${tag.name} · clic pour voir le commit`}
        focusable={key === focusable}
        onFocus={setFocusKey}
        onSelect={handleShow}
        onActivate={handleShow}
        onMenu={openMenu(`Actions du tag ${tag.name}`, tagMenu(tag, state))}
      />
    )
  }
  const renderStash = (stash: GitStash) => {
    const key = `${STASHES}\n${stash.sha}`
    const handleShow = () => showCommit(stash.sha)
    return (
      <GitRefRow
        key={key}
        rowKey={key}
        icon={IconName.Stash}
        name={stash.message}
        meta={`stash@{${stash.index}}`}
        tip={`${stash.message} · clic pour voir les modifications`}
        focusable={key === focusable}
        onFocus={setFocusKey}
        onSelect={handleShow}
        onActivate={handleShow}
        onMenu={openMenu('Actions du stash', stashMenu(stash, state))}
      />
    )
  }

  const headerButton = (icon: IconName, label: string, onClick: () => void, disabled = false) => {
    const handleClick = () => {
      if (!disabled) {
        onClick()
      }
    }
    return (
      <button type="button" className={`${ROW_ACTION} aria-disabled:cursor-default aria-disabled:opacity-40`} aria-label={label} aria-disabled={disabled} data-tip={label} onClick={handleClick}>
        <Icon name={icon} />
      </button>
    )
  }

  return (
    <div ref={containerRef} role="listbox" aria-label="Branches, tags et stashes" className="min-h-0 flex-1 overflow-auto py-[4px]" onKeyDown={handleKeyDown}>
      <GitSection title="Locales" count={state.branches.length} expanded={!collapsed[LOCAL]} empty="Aucune branche." onToggle={toggle(LOCAL)} actions={headerButton(IconName.Plus, 'Nouvelle branche depuis HEAD', handleNewBranch, state.head.unborn)}>
        {state.branches.map(renderBranch)}
      </GitSection>
      <GitSection title="Distantes" count={state.remoteBranches.length} expanded={!collapsed[REMOTE]} empty={state.remotes.length === 0 ? 'Aucun dépôt distant configuré.' : 'Aucune branche distante.'} onToggle={toggle(REMOTE)}>
        {groups.map((group) => (
          <GitSection key={group.remote} title={group.remote} count={group.branches.length} nested expanded={!collapsed[groupKey(group.remote)]} empty="Aucune branche récupérée." onToggle={toggle(groupKey(group.remote))}>
            {group.branches.map(renderRemoteBranch)}
          </GitSection>
        ))}
      </GitSection>
      <GitSection title="Tags" count={state.tags.length} expanded={!collapsed[TAGS]} empty="Aucun tag." onToggle={toggle(TAGS)} actions={headerButton(IconName.Plus, 'Nouveau tag sur HEAD', handleNewTag, state.head.unborn)}>
        {state.tags.map(renderTag)}
      </GitSection>
      <GitSection title="Stash" count={state.stashes.length} expanded={!collapsed[STASHES]} empty="Aucune modification remisée." onToggle={toggle(STASHES)} actions={headerButton(IconName.Stash, clean ? 'Aucune modification à remiser' : 'Remiser les modifications', promptStash, clean)}>
        {state.stashes.map(renderStash)}
      </GitSection>
      {menu && <GitContextMenu x={menu.x} y={menu.y} label={menu.label} items={menu.items} onDismiss={handleDismissMenu} />}
    </div>
  )
}
