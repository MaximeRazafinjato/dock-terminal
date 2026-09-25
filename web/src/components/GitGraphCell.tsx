import { GitSegmentKind, type GitGraphRow, type GitGraphSegment } from '../bridge/gitMessages'

interface GitGraphCellProps {
  graph: GitGraphRow
  head: boolean
}

export const GRAPH_ROW_HEIGHT = 24
const LANE_WIDTH = 12
const MAX_LANES = 10
const NODE_RADIUS = 3.5
const HEAD_RADIUS = 5
const LANE_STROKES = ['stroke-dock-lane-0', 'stroke-dock-lane-1', 'stroke-dock-lane-2', 'stroke-dock-lane-3', 'stroke-dock-lane-4', 'stroke-dock-lane-5', 'stroke-dock-lane-6', 'stroke-dock-lane-7']
const LANE_FILLS = ['fill-dock-lane-0', 'fill-dock-lane-1', 'fill-dock-lane-2', 'fill-dock-lane-3', 'fill-dock-lane-4', 'fill-dock-lane-5', 'fill-dock-lane-6', 'fill-dock-lane-7']

const laneX = (lane: number): number => lane * LANE_WIDTH + LANE_WIDTH / 2

const segmentPath = ({ from, to, kind }: GitGraphSegment): string => {
  const middle = GRAPH_ROW_HEIGHT / 2
  const [start, end] = [laneX(from), laneX(to)]
  if (kind === GitSegmentKind.Through) {
    return `M${start} 0V${GRAPH_ROW_HEIGHT}`
  }
  if (kind === GitSegmentKind.In) {
    return start === end ? `M${start} 0V${middle}` : `M${start} 0C${start} ${middle} ${end} 0 ${end} ${middle}`
  }
  return start === end ? `M${start} ${middle}V${GRAPH_ROW_HEIGHT}` : `M${start} ${middle}C${start} ${GRAPH_ROW_HEIGHT} ${end} ${middle} ${end} ${GRAPH_ROW_HEIGHT}`
}

export function GitGraphCell({ graph, head }: GitGraphCellProps) {
  const width = Math.min(graph.width, MAX_LANES) * LANE_WIDTH
  const x = laneX(graph.lane)
  const middle = GRAPH_ROW_HEIGHT / 2

  return (
    <svg width={width} height={GRAPH_ROW_HEIGHT} className="shrink-0 overflow-hidden" aria-hidden="true">
      {graph.segments.map((segment, index) => (
        <path key={index} d={segmentPath(segment)} fill="none" strokeWidth={1.5} className={LANE_STROKES[segment.color % LANE_STROKES.length]} />
      ))}
      {head && <circle cx={x} cy={middle} r={HEAD_RADIUS} fill="none" strokeWidth={1.2} className="stroke-dock-ink" />}
      <circle cx={x} cy={middle} r={NODE_RADIUS} className={LANE_FILLS[graph.color % LANE_FILLS.length]} />
    </svg>
  )
}
