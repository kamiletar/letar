'use client'

import { Box, IconButton } from '@chakra-ui/react'
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createContext, type CSSProperties, type ReactElement, type ReactNode, useContext } from 'react'

/**
 * Context for drag handle - allows children to access drag listeners
 */
interface SortableItemContextValue {
  /** Attributes for the drag handle */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attributes: any
  /** Listeners for the drag handle */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listeners: any
  /** Whether item is being dragged */
  isDragging: boolean
}

const SortableItemContext = createContext<SortableItemContextValue | null>(null)

/**
 * Hook to access sortable item context (for drag handle)
 */
export function useSortableItemContext(): SortableItemContextValue | null {
  return useContext(SortableItemContext)
}

/**
 * Props for SortableWrapper
 */
export interface SortableWrapperProps {
  /** Array of unique IDs for sortable items */
  items: string[]
  /** Callback when drag ends - receives old and new indices */
  onReorder: (oldIndex: number, newIndex: number) => void
  /** Children to render */
  children: ReactNode
}

/**
 * Wrapper that provides DnD context for sortable list
 *
 * @example
 * ```tsx
 * <SortableWrapper items={['id-1', 'id-2']} onReorder={handleReorder}>
 *   {items.map(item => (
 *     <SortableItem key={item.id} id={item.id}>
 *       <ItemContent />
 *     </SortableItem>
 *   ))}
 * </SortableWrapper>
 * ```
 */
export function SortableWrapper({ items, onReorder, children }: SortableWrapperProps): ReactElement {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = items.indexOf(String(active.id))
      const newIndex = items.indexOf(String(over.id))

      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder(oldIndex, newIndex)
      }
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  )
}

/**
 * Props for SortableItem
 */
export interface SortableItemProps {
  /** Unique ID for this item */
  id: string
  /** Children to render */
  children: ReactNode
}

/**
 * Individual sortable item wrapper
 *
 * Provides drag handle context to children via useSortableItemContext()
 *
 * @example
 * ```tsx
 * <SortableItem id="item-1">
 *   <DragHandle />
 *   <Form.Field.String name="title" />
 * </SortableItem>
 * ```
 */
export function SortableItem({ id, children }: SortableItemProps): ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
  }

  const contextValue: SortableItemContextValue = {
    attributes,
    listeners,
    isDragging,
  }

  return (
    <SortableItemContext.Provider value={contextValue}>
      <Box ref={setNodeRef} style={style}>
        {children}
      </Box>
    </SortableItemContext.Provider>
  )
}

/**
 * Props for DragHandle
 */
export interface DragHandleProps {
  /** Custom children (default: grip icon) */
  children?: ReactNode
}

/**
 * Drag handle component for sortable items
 *
 * Must be used inside SortableItem. Click and drag this to reorder.
 *
 * @example
 * ```tsx
 * <SortableItem id="item-1">
 *   <HStack>
 *     <DragHandle />
 *     <Form.Field.String name="title" />
 *   </HStack>
 * </SortableItem>
 * ```
 */
export function DragHandle({ children }: DragHandleProps): ReactElement | null {
  const context = useSortableItemContext()

  if (!context) {
    return null
  }

  const { attributes, listeners, isDragging } = context

  return (
    <IconButton
      {...attributes}
      {...listeners}
      type="button"
      variant="ghost"
      size="sm"
      cursor={isDragging ? 'grabbing' : 'grab'}
      aria-label="Drag to reorder"
      _hover={{ bg: 'gray.100' }}
      _dark={{ _hover: { bg: 'gray.700' } }}
    >
      {children || '⋮⋮'}
    </IconButton>
  )
}
