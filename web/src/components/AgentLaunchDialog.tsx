import { useEffect, type ChangeEvent, type KeyboardEvent as ReactKeyboardEvent, type SubmitEvent } from 'react'
import { activeRepository, changeAgentLaunch, closeAgentLaunch, submitAgentLaunch } from '../agents/agentLaunch'
import type { Project } from '../bridge/messages'
import { AgentLaunchTarget, type AgentLaunchMode } from '../model/session'
import { ACTIVE_PANE_SOURCE, NEW_WORKTREE_SOURCE, type AgentLaunchDraft } from '../store/agentLaunchStore'
import { AgentLaunchModes } from './AgentLaunchModes'
import { keepTabInside } from './focusTrap'
import { SETTINGS_BUTTON, SETTINGS_HINT, SETTINGS_INPUT, SETTINGS_LABEL, SETTINGS_SECONDARY } from './settingsStyles'

interface AgentLaunchDialogProps {
  draft: AgentLaunchDraft
  activePath: string | undefined
  projects: Project[]
}

const PRIMARY = `${SETTINGS_BUTTON} border-tily-green text-tily-green-deep hover:bg-tily-green-soft disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent`
const TARGETS: { target: AgentLaunchTarget; label: string }[] = [
  { target: AgentLaunchTarget.Tab, label: 'Nouvel onglet' },
  { target: AgentLaunchTarget.Workspace, label: 'Nouveau workspace' },
  { target: AgentLaunchTarget.Split, label: 'Split à côté du pane actif' },
]

const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
  event.preventDefault()
  submitAgentLaunch()
}
const handleSourceChange = (event: ChangeEvent<HTMLSelectElement>) => changeAgentLaunch({ source: event.target.value })
const handleTaskChange = (event: ChangeEvent<HTMLTextAreaElement>) => changeAgentLaunch({ task: event.target.value })
const handleModeChange = (mode: AgentLaunchMode) => changeAgentLaunch({ mode })
const handleTargetChange = (event: ChangeEvent<HTMLInputElement>) => changeAgentLaunch({ target: event.target.value as AgentLaunchTarget })
const handleTaskKeys = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
  if (event.key === 'Enter' && event.ctrlKey) {
    event.preventDefault()
    submitAgentLaunch()
  }
}

const projectOptions = (label: string, projects: Project[]) =>
  projects.length > 0 && (
    <optgroup label={label}>
      {projects.map((project) => (
        <option key={project.path} value={project.path}>
          {project.name}
        </option>
      ))}
    </optgroup>
  )

export function AgentLaunchDialog({ draft, activePath, projects }: AgentLaunchDialogProps) {
  const repository = activeRepository()
  const toWorktree = draft.source === NEW_WORKTREE_SOURCE
  const pending = draft.request !== null
  const canLaunch = draft.task.trim().length > 0 && !pending && (draft.source !== ACTIVE_PANE_SOURCE || activePath !== undefined)

  useEffect(() => {
    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeAgentLaunch()
      }
    }
    document.addEventListener('keydown', handleDocumentKeyDown)
    return () => document.removeEventListener('keydown', handleDocumentKeyDown)
  }, [])

  return (
    <div className="absolute inset-0 z-30 flex items-start justify-center bg-tily-paper/60 pt-[10vh]">
      <form role="dialog" aria-label="Lancer un agent" className="flex max-h-[80vh] w-[600px] max-w-[94vw] flex-col rounded-lg border border-tily-line bg-tily-panel shadow-xl" onKeyDown={keepTabInside} onSubmit={handleSubmit}>
        <div className="flex items-center justify-between border-b border-tily-line px-4 py-3">
          <h2 className="text-[15px] font-semibold text-tily-ink">Lancer un agent</h2>
          <span className={SETTINGS_HINT}>Ctrl + Entrée lance · Échap ferme</span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
          <label className="flex flex-col gap-1">
            <span className={SETTINGS_LABEL}>Dossier</span>
            <select className={SETTINGS_INPUT} value={draft.source} disabled={pending} onChange={handleSourceChange}>
              <option value={ACTIVE_PANE_SOURCE}>{activePath ? `Dossier du pane actif · ${activePath}` : 'Dossier du pane actif (aucun pane)'}</option>
              {projectOptions('Projets', projects.filter((project) => !project.worktree))}
              {projectOptions('Worktrees', projects.filter((project) => project.worktree))}
              <option value={NEW_WORKTREE_SOURCE} disabled={repository === null}>
                {repository ? 'Nouveau worktree du dépôt du pane actif…' : 'Nouveau worktree (le pane actif n’est pas dans un dépôt Git)'}
              </option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={SETTINGS_LABEL}>Tâche</span>
            <textarea className={`${SETTINGS_INPUT} min-h-[120px] resize-y font-mono`} value={draft.task} autoFocus disabled={pending} placeholder="Décrivez la tâche : elle est collée dans Claude Code telle quelle, sauts de ligne et guillemets compris." onChange={handleTaskChange} onKeyDown={handleTaskKeys} />
          </label>
          <div className="flex flex-col gap-1">
            <span className={SETTINGS_LABEL}>Mode de départ</span>
            <AgentLaunchModes name="agent-launch-mode" mode={draft.mode} disabled={pending} onChange={handleModeChange} />
          </div>
          {!toWorktree && (
            <div role="radiogroup" aria-label="Ouvrir dans" className="flex flex-col gap-1">
              <span className={SETTINGS_LABEL}>Ouvrir dans</span>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {TARGETS.map((choice) => (
                  <label key={choice.target} className="flex items-center gap-2 text-[12px] text-tily-ink">
                    <input type="radio" name="agent-launch-target" value={choice.target} checked={draft.target === choice.target} disabled={pending} onChange={handleTargetChange} />
                    {choice.label}
                  </label>
                ))}
              </div>
            </div>
          )}
          <span className={SETTINGS_HINT}>
            {toWorktree
              ? 'Le formulaire de création du worktree s’ouvre ensuite : Claude démarre dans son terminal, après pnpm install.'
              : 'Claude Code démarre avec le modèle de ses réglages ; la tâche lui est collée dès qu’il est prêt. Mode et emplacement sont retenus pour la prochaine fois.'}
          </span>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-tily-line px-4 py-3">
          <button type="button" className={SETTINGS_SECONDARY} onClick={closeAgentLaunch}>
            Annuler
          </button>
          <button type="submit" className={PRIMARY} disabled={!canLaunch}>
            {toWorktree ? 'Continuer…' : pending ? 'Lancement…' : 'Lancer'}
          </button>
        </div>
      </form>
    </div>
  )
}
