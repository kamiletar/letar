'use client'

/**
 * Сортируемая обёртка для ImportQueueItem
 *
 * Использует @dnd-kit/sortable для drag & drop в очереди
 */

import { Box, Icon } from '@chakra-ui/react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'
import { LuGripVertical } from 'react-icons/lu'

import type { ImportQueueAddData, ImportQueueEntry } from '../../../../shared/types/import-queue'
import { EditQueueItemDialog } from './EditQueueItemDialog'
import { ImportQueueItem } from './ImportQueueItem'

interface SortableQueueItemProps {
  /** Элемент очереди */
  item: ImportQueueEntry
  /** Callback удаления */
  onRemove: () => void
  /** Callback обновления */
  onUpdate?: (itemId: string, data: Partial<ImportQueueAddData>) => Promise<void>
  /** Элемент в фокусе (keyboard navigation) */
  isFocused?: boolean
  /** Callback при фокусе */
  onFocus?: () => void
}

export function SortableQueueItem({ item, onRemove, onUpdate, isFocused, onFocus }: SortableQueueItemProps) {
  const [showEditDialog, setShowEditDialog] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const animeName = item.selectedAnime.russian || item.selectedAnime.name

  return (
    <Box ref={setNodeRef} style={style} position="relative">
      {/* Drag handle с accessibility из useSortable */}
      <Box
        {...attributes}
        {...listeners}
        position="absolute"
        left="-28px"
        top="50%"
        transform="translateY(-50%)"
        cursor={isDragging ? 'grabbing' : 'grab'}
        color="fg.muted"
        _hover={{ color: 'fg' }}
        _focus={{ color: 'purple.400', outline: '2px solid', outlineColor: 'purple.500', outlineOffset: '2px' }}
        p={1}
        borderRadius="md"
        aria-label={`Перетащить "${animeName}"`}
      >
        <Icon as={LuGripVertical} boxSize={5} />
      </Box>

      <ImportQueueItem
        item={item}
        isCurrent={false}
        onRemove={onRemove}
        onEdit={onUpdate ? () => setShowEditDialog(true) : undefined}
        isFocused={isFocused}
        onFocus={onFocus}
      />

      {/* Диалог редактирования (controlled mode) */}
      {onUpdate && (
        <EditQueueItemDialog
          item={item}
          onUpdate={onUpdate}
          isOpen={showEditDialog}
          onClose={() => setShowEditDialog(false)}
        />
      )}
    </Box>
  )
}
