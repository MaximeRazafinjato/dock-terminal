import { GitResetMode, type GitBranch, type GitCommit, type GitRemoteBranch, type GitState, type GitStash, type GitTag } from '../bridge/gitMessages'
import type { ActionMenuItem } from '../components/ActionMenu'
import { currentName, shortSha } from './gitLabels'
import {
  applyStash,
  checkoutCommit,
  cherryPickCommit,
  deleteBranch,
  deleteRemoteBranch,
  deleteTag,
  dropStash,
  mergeIntoCurrent,
  promptNewBranch,
  promptNewTag,
  promptRenameBranch,
  pushTag,
  rebaseCurrentOnto,
  resetCurrentTo,
  switchToBranch,
  switchToRemote,
} from './gitRefActions'
import { copyToClipboard, showCommit } from './gitRequests'

const copyName = (name: string): ActionMenuItem => ({ id: 'copy', label: 'Copier le nom', run: () => copyToClipboard(name, `Nom copié : ${name}`) })

export const branchMenu = (branch: GitBranch, state: GitState): ActionMenuItem[] => {
  const current = currentName(state.head)
  const blocked = Boolean(state.operation)
  return [
    { id: 'switch', label: 'Basculer sur cette branche', disabled: branch.current || blocked, run: () => switchToBranch(branch) },
    { id: 'merge', label: `Fusionner dans « ${current} »`, disabled: branch.current || blocked, run: () => mergeIntoCurrent(branch.name) },
    { id: 'rebase', label: `Rebaser « ${current} » sur cette branche`, disabled: branch.current || blocked || state.head.detached, run: () => rebaseCurrentOnto(branch.name) },
    { id: 'show', label: 'Voir le dernier commit', run: () => showCommit(branch.sha) },
    { id: 'branch', label: 'Créer une branche ici…', run: () => promptNewBranch(branch.name, branch.name) },
    { id: 'tag', label: 'Créer un tag ici…', run: () => promptNewTag(branch.sha, `« ${branch.name} »`) },
    { id: 'rename', label: 'Renommer…', run: () => promptRenameBranch(branch) },
    { id: 'delete', label: branch.merged ? 'Supprimer' : 'Supprimer (non fusionnée)…', disabled: branch.current, run: () => deleteBranch(branch) },
    copyName(branch.name),
  ]
}

export const remoteBranchMenu = (branch: GitRemoteBranch, state: GitState): ActionMenuItem[] => {
  const current = currentName(state.head)
  const blocked = Boolean(state.operation)
  return [
    { id: 'switch', label: 'Basculer (branche locale suivie)', disabled: blocked, run: () => switchToRemote(branch) },
    { id: 'merge', label: `Fusionner dans « ${current} »`, disabled: blocked, run: () => mergeIntoCurrent(branch.name) },
    { id: 'rebase', label: `Rebaser « ${current} » sur cette branche`, disabled: blocked || state.head.detached, run: () => rebaseCurrentOnto(branch.name) },
    { id: 'show', label: 'Voir le dernier commit', run: () => showCommit(branch.sha) },
    { id: 'branch', label: 'Créer une branche ici…', run: () => promptNewBranch(branch.name, branch.name) },
    { id: 'delete', label: 'Supprimer la branche distante…', run: () => deleteRemoteBranch(branch) },
    copyName(branch.name),
  ]
}

export const tagMenu = (tag: GitTag, state: GitState): ActionMenuItem[] => [
  { id: 'show', label: 'Voir le commit', run: () => showCommit(tag.sha) },
  { id: 'push', label: 'Pousser le tag', disabled: state.remotes.length === 0, run: () => pushTag(tag) },
  { id: 'branch', label: 'Créer une branche ici…', run: () => promptNewBranch(tag.sha, tag.name) },
  { id: 'delete', label: 'Supprimer le tag', run: () => deleteTag(tag) },
  copyName(tag.name),
]

export const stashMenu = (stash: GitStash, state: GitState): ActionMenuItem[] => [
  { id: 'show', label: 'Voir les modifications', run: () => showCommit(stash.sha) },
  { id: 'apply', label: 'Appliquer', disabled: Boolean(state.operation), run: () => applyStash(stash, false) },
  { id: 'pop', label: 'Appliquer et supprimer', disabled: Boolean(state.operation), run: () => applyStash(stash, true) },
  { id: 'drop', label: 'Supprimer…', run: () => dropStash(stash) },
]

export const commitMenu = (commit: GitCommit, state: GitState): ActionMenuItem[] => {
  const current = currentName(state.head)
  const isHead = commit.sha === state.head.sha
  const blocked = Boolean(state.operation)
  const short = shortSha(commit.sha)
  return [
    { id: 'show', label: 'Voir le commit', run: () => showCommit(commit.sha) },
    { id: 'checkout', label: 'Extraire ce commit (HEAD détachée)', disabled: isHead || blocked, run: () => checkoutCommit(commit) },
    { id: 'branch', label: 'Créer une branche ici…', run: () => promptNewBranch(commit.sha, short) },
    { id: 'tag', label: 'Créer un tag ici…', run: () => promptNewTag(commit.sha, short) },
    { id: 'cherry-pick', label: `Cherry-pick sur « ${current} »`, disabled: isHead || blocked, run: () => cherryPickCommit(commit) },
    { id: 'merge', label: `Fusionner dans « ${current} »`, disabled: isHead || blocked, run: () => mergeIntoCurrent(commit.sha) },
    { id: 'rebase', label: `Rebaser « ${current} » ici`, disabled: isHead || blocked || state.head.detached, run: () => rebaseCurrentOnto(commit.sha) },
    { id: 'reset-soft', label: `Reset soft de « ${current} » ici`, disabled: isHead || blocked, run: () => resetCurrentTo(commit, GitResetMode.Soft) },
    { id: 'reset-mixed', label: `Reset mixed de « ${current} » ici`, disabled: isHead || blocked, run: () => resetCurrentTo(commit, GitResetMode.Mixed) },
    { id: 'reset-hard', label: `Reset hard de « ${current} » ici…`, disabled: isHead || blocked, run: () => resetCurrentTo(commit, GitResetMode.Hard) },
    { id: 'copy-sha', label: 'Copier le SHA', run: () => copyToClipboard(commit.sha, `SHA copié : ${short}`) },
    { id: 'copy-subject', label: 'Copier le message', run: () => copyToClipboard(commit.subject, 'Message copié.') },
  ]
}
