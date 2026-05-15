'use client'

/**
 * Кастомная связь React Flow для отображения типа связи между аниме
 */

import { Badge } from '@chakra-ui/react'
import { BaseEdge, EdgeLabelRenderer, type EdgeProps, getBezierPath } from '@xyflow/react'
import { memo } from 'react'

import type { RelationEdgeData } from './types'

/** Цвета для типов связей */
const RELATION_COLORS: Record<string, string> = {
  sequel: 'green',
  prequel: 'blue',
  side_story: 'orange',
  parent_story: 'purple',
  spin_off: 'pink',
  adaptation: 'teal',
  summary: 'gray',
  full_story: 'cyan',
  alternative_version: 'yellow',
  alternative_setting: 'yellow',
  character: 'gray',
  other: 'gray',
}

/** Компонент связи между аниме */
function RelationEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const edgeData = data as RelationEdgeData | undefined
  const color = RELATION_COLORS[edgeData?.relation || 'other'] || 'gray'

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? 'var(--chakra-colors-purple-500)' : `var(--chakra-colors-${color}-400)`,
          strokeWidth: selected ? 3 : 2,
          opacity: 0.8,
        }}
        markerEnd="url(#arrow)"
      />

      {/* Лейбл с типом связи */}
      {edgeData?.relationLabel && (
        <EdgeLabelRenderer>
          <Badge
            position="absolute"
            transform={`translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`}
            pointerEvents="all"
            colorPalette={color}
            variant="subtle"
            fontSize="xs"
            className="nodrag nopan"
          >
            {edgeData.relationLabel}
          </Badge>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export const RelationEdge = memo(RelationEdgeComponent)
