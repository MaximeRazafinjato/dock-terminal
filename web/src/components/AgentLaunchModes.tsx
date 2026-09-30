import type { ChangeEvent } from 'react'
import { AgentLaunchMode } from '../model/session'

interface AgentLaunchModesProps {
  name: string
  mode: AgentLaunchMode
  disabled?: boolean
  onChange: (mode: AgentLaunchMode) => void
}

const MODES: { mode: AgentLaunchMode; label: string; tip: string }[] = [
  { mode: AgentLaunchMode.Default, label: 'Défaut', tip: 'Mode de permission des réglages de Claude Code' },
  { mode: AgentLaunchMode.Plan, label: 'Plan', tip: 'Claude prépare un plan avant de modifier quoi que ce soit' },
  { mode: AgentLaunchMode.AcceptEdits, label: 'Modifications acceptées', tip: 'Les modifications de fichiers sont acceptées sans demande' },
]

export function AgentLaunchModes({ name, mode, disabled, onChange }: AgentLaunchModesProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value as AgentLaunchMode)

  return (
    <div role="radiogroup" aria-label="Mode de départ" className="flex flex-wrap gap-x-4 gap-y-1">
      {MODES.map((choice) => (
        <label key={choice.mode} className="flex items-center gap-2 text-[12px] text-tily-ink" data-tip={choice.tip}>
          <input type="radio" name={name} value={choice.mode} checked={mode === choice.mode} disabled={disabled} onChange={handleChange} />
          {choice.label}
        </label>
      ))}
    </div>
  )
}
