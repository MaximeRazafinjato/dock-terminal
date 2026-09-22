import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent, type PointerEvent } from 'react'
import type { PersistenceSettings, Settings, SettingsSnapshot } from '../bridge/messages'

interface SettingsDialogProps {
  snapshot: SettingsSnapshot | null
  onClose: () => void
  onSave: (settings: Settings) => void
}

interface NumberField {
  key: keyof PersistenceSettings
  label: string
  hint: string
  min: number
  max: number
}

const NUMBER_FIELDS: NumberField[] = [
  { key: 'textIntervalSeconds', label: 'Sauvegarde du texte (secondes)', hint: 'Intervalle entre deux écritures du texte des terminaux.', min: 5, max: 600 },
  { key: 'linesPerPane', label: 'Lignes conservées par pane', hint: 'Historique xterm.js ; s’applique aux terminaux lancés après l’enregistrement.', min: 500, max: 100000 },
  { key: 'maxTextMebibytes', label: 'Historique global maximal (Mio)', hint: 'Au-delà, les panes les plus récents ne sont plus sauvegardés.', min: 16, max: 2048 },
]

const SECTION = 'text-[11px] font-semibold tracking-wide text-dock-muted uppercase'
const LABEL = 'text-[12px] text-dock-ink'
const HINT = 'text-[11px] text-dock-muted'
const INPUT = 'w-full rounded border border-dock-line bg-dock-paper px-2 py-1.5 font-mono text-[12px] text-dock-ink outline-none placeholder:text-dock-muted focus:border-dock-focus'
const BUTTON = 'cursor-pointer rounded border px-3 py-1.5 text-[12px]'
const PRIMARY = `${BUTTON} border-dock-green text-dock-green-deep hover:bg-dock-green-soft`
const SECONDARY = `${BUTTON} border-dock-line text-dock-ink hover:bg-dock-green-hover`

export function SettingsDialog({ snapshot, onClose, onSave }: SettingsDialogProps) {
  const [draft, setDraft] = useState<Settings | null>(null)
  const [seenSnapshot, setSeenSnapshot] = useState<SettingsSnapshot | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  if (snapshot !== seenSnapshot) {
    setSeenSnapshot(snapshot)
    setDraft(snapshot ? structuredClone(snapshot.settings) : null)
  }

  useEffect(() => {
    const handleDocumentKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handleDocumentKeyDown)
    return () => document.removeEventListener('keydown', handleDocumentKeyDown)
  }, [onClose])

  const loaded = draft !== null
  useEffect(() => {
    if (loaded) {
      dialogRef.current?.querySelector<HTMLInputElement>('input')?.focus()
    }
  }, [loaded])

  const handleBackdropPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }
  const handleSave = () => {
    if (draft) {
      onSave(draft)
    }
  }
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault()
      handleSave()
    }
  }
  const updateDraft = (patch: Partial<Settings>) => setDraft((current) => (current ? { ...current, ...patch } : current))
  const handleEditorChange = (event: ChangeEvent<HTMLInputElement>) => updateDraft({ editor: event.target.value })
  const handleProjectsRootChange = (event: ChangeEvent<HTMLInputElement>) => updateDraft({ projectsRoot: event.target.value })

  const renderBody = (settings: Settings, current: SettingsSnapshot) => (
    <>
      {current.warnings.length > 0 && (
        <ul className="rounded border border-dock-warning/50 bg-dock-paper px-3 py-2 text-[12px] text-dock-warning">
          {current.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
      <section className="flex flex-col gap-2">
        <h3 className={SECTION}>Shells</h3>
        <p className={HINT}>Vide = chemin par défaut. Un chemin introuvable est enregistré mais le shell reste indisponible.</p>
        {current.shellSettings.map((shell) => {
          const handleChange = (event: ChangeEvent<HTMLInputElement>) => updateDraft({ shells: { ...settings.shells, [shell.id]: event.target.value } })
          return (
            <label key={shell.id} className="flex flex-col gap-1">
              <span className="flex items-baseline justify-between">
                <span className={LABEL}>{shell.name}</span>
                <span className={`text-[11px] ${shell.available ? 'text-dock-green' : 'text-dock-warning'}`}>{shell.available ? 'Disponible' : 'Introuvable'}</span>
              </span>
              <input type="text" className={INPUT} value={settings.shells[shell.id] ?? ''} placeholder={shell.defaultExecutable} spellCheck={false} onChange={handleChange} />
            </label>
          )
        })}
        <p className={`${HINT} font-mono`}>{current.files.shells}</p>
      </section>
      <section className="flex flex-col gap-2">
        <h3 className={SECTION}>Éditeur</h3>
        <label className="flex flex-col gap-1">
          <span className={LABEL}>Commande d’ouverture d’un dossier</span>
          <input type="text" className={INPUT} value={settings.editor} placeholder="code.cmd" spellCheck={false} onChange={handleEditorChange} />
        </label>
        <p className={`${HINT} font-mono`}>{current.files.editor}</p>
      </section>
      <section className="flex flex-col gap-2">
        <h3 className={SECTION}>Persistance</h3>
        {NUMBER_FIELDS.map((field) => {
          const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
            const value = Number.parseInt(event.target.value, 10)
            updateDraft({ persistence: { ...settings.persistence, [field.key]: Number.isNaN(value) ? settings.persistence[field.key] : value } })
          }
          return (
            <label key={field.key} className="flex flex-col gap-1">
              <span className={LABEL}>{field.label}</span>
              <input type="number" className={INPUT} value={settings.persistence[field.key]} min={field.min} max={field.max} onChange={handleChange} />
              <span className={HINT}>{`${field.hint} Entre ${field.min} et ${field.max}.`}</span>
            </label>
          )
        })}
        <p className={`${HINT} font-mono`}>{current.files.persistence}</p>
      </section>
      <section className="flex flex-col gap-2">
        <h3 className={SECTION}>Projets</h3>
        <label className="flex flex-col gap-1">
          <span className={LABEL}>Dossier racine des projets</span>
          <input type="text" className={INPUT} value={settings.projectsRoot} spellCheck={false} onChange={handleProjectsRootChange} />
          <span className={HINT}>Dossiers de premier niveau listés par le sélecteur de projets, hors « worktrees » et dossiers cachés.</span>
        </label>
        <p className={`${HINT} font-mono`}>{current.files.projects}</p>
      </section>
    </>
  )

  return (
    <div className="absolute inset-0 z-30 flex items-start justify-center bg-dock-paper/60 pt-[6vh]" onPointerDown={handleBackdropPointerDown}>
      <div ref={dialogRef} role="dialog" aria-label="Paramètres" className="flex max-h-[86vh] w-[640px] max-w-[94vw] flex-col rounded-lg border border-dock-line bg-dock-panel shadow-xl" onKeyDown={handleKeyDown}>
        <div className="flex items-center justify-between border-b border-dock-line px-4 py-3">
          <h2 className="text-[15px] font-semibold text-dock-ink">Paramètres</h2>
          <span className={HINT}>Ctrl + Entrée enregistre · Échap ferme</span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-4">
          {draft && snapshot ? renderBody(draft, snapshot) : <p className={HINT}>Chargement des réglages…</p>}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-dock-line px-4 py-3">
          <button type="button" className={SECONDARY} onClick={onClose}>
            Annuler
          </button>
          <button type="button" className={PRIMARY} aria-disabled={!draft} data-tip="Écrit les quatre fichiers et applique immédiatement" onClick={handleSave}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}
