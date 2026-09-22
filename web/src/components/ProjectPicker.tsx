import { useMemo } from 'react'
import type { Project } from '../bridge/messages'
import type { SearchItem } from '../palette/searchFilter'
import { SearchDialog } from './SearchDialog'

interface ProjectPickerProps {
  projects: Project[]
  root: string
  error: string | null
  onClose: () => void
  onSelect: (project: Project) => void
}

interface ProjectItem extends SearchItem {
  project: Project
}

export function ProjectPicker({ projects, root, error, onClose, onSelect }: ProjectPickerProps) {
  const items = useMemo<ProjectItem[]>(() => projects.map((project) => ({ id: project.path, label: project.name, hint: project.path, project })), [projects])
  const handleRun = (item: ProjectItem) => onSelect(item.project)

  return (
    <SearchDialog
      label="Ouvrir un projet"
      placeholder={`Dossier dans ${root}…`}
      emptyMessage={error ?? 'Aucun dossier trouvé.'}
      items={items}
      onClose={onClose}
      onRun={handleRun}
    />
  )
}
