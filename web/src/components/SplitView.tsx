import { isLeaf, SplitAxis, type SplitNode } from '../model/session'
import { PaneView } from './PaneView'

interface SplitViewProps {
  node: SplitNode
  activePaneId: string
  onFocus: (paneId: string) => void
  onClose: (paneId: string) => void
}

export function SplitView({ node, activePaneId, onFocus, onClose }: SplitViewProps) {
  if (isLeaf(node)) {
    return <PaneView pane={node.pane} active={node.pane.id === activePaneId} onFocus={onFocus} onClose={onClose} />
  }
  const horizontal = node.axis === SplitAxis.Horizontal
  const first = `${node.ratio * 100}%`
  return (
    <div className={`flex h-full min-h-0 min-w-0 gap-1 ${horizontal ? 'flex-row' : 'flex-col'}`}>
      <div className="min-h-0 min-w-0" style={horizontal ? { width: first } : { height: first }}>
        <SplitView node={node.a} activePaneId={activePaneId} onFocus={onFocus} onClose={onClose} />
      </div>
      <div className="min-h-0 min-w-0 flex-1">
        <SplitView node={node.b} activePaneId={activePaneId} onFocus={onFocus} onClose={onClose} />
      </div>
    </div>
  )
}
