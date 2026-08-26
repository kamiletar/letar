'use client'

/**
 * Sortable item для drag-and-drop дорожек
 */

import { Badge, Box, Button, Flex, HStack, Text } from '@chakra-ui/react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { LuGripVertical, LuStar } from 'react-icons/lu'

import type { TrackInfo } from './export-types'

/**
 * Props для SortableTrackItem
 */
export interface SortableTrackItemProps {
  track: TrackInfo
  isDefault: boolean
  onSetDefault: () => void
  colorPalette: 'blue' | 'purple'
  showDefaultButton: boolean
}

/**
 * Sortable item для drag-and-drop дорожек
 */
export function SortableTrackItem({
  track,
  isDefault,
  onSetDefault,
  colorPalette,
  showDefaultButton,
}: SortableTrackItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: track.key })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Flex
      ref={setNodeRef}
      style={style}
      align="center"
      gap={2}
      p={2}
      bg={isDefault ? `${colorPalette}.900` : 'bg.subtle'}
      borderRadius="md"
      borderWidth={isDefault ? '1px' : '0'}
      borderColor={isDefault ? `${colorPalette}.500` : 'transparent'}
    >
      {/* Drag handle */}
      <Box {...attributes} {...listeners} cursor="grab" color="fg.subtle" _hover={{ color: 'fg.muted' }}>
        <LuGripVertical />
      </Box>

      {/* Track info */}
      <HStack flex={1} gap={2}>
        <Badge colorPalette={colorPalette} size="sm">
          {track.language}
        </Badge>
        <Text fontSize="sm">{track.title}</Text>
        {track.codec && (
          <Text color="fg.subtle" fontSize="xs">
            ({track.codec})
          </Text>
        )}
        {track.format && (
          <Text color="fg.subtle" fontSize="xs">
            ({track.format})
          </Text>
        )}
        <Text color="fg.subtle" fontSize="xs">
          · {track.episodeCount} эп.
        </Text>
      </HStack>

      {/* Default button */}
      {showDefaultButton && (
        <Button
          size="xs"
          variant={isDefault ? 'solid' : 'ghost'}
          colorPalette={isDefault ? colorPalette : 'gray'}
          onClick={onSetDefault}
          title={isDefault ? 'Дорожка по умолчанию' : 'Сделать дорожкой по умолчанию'}
        >
          <LuStar />
        </Button>
      )}
    </Flex>
  )
}
