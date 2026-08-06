'use client'

import { Box, Drawer, HStack, IconButton, Text, VStack } from '@chakra-ui/react'
import type { DragEndEvent } from '@dnd-kit/core'
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTranslations } from 'next-intl'
import { useCallback } from 'react'
import { LuGripVertical, LuMusic, LuRepeat, LuRepeat1, LuShuffle, LuX } from 'react-icons/lu'
import type { RepeatMode } from '../../_constants/viewer-constants'
import { REPEAT_MODE_LABELS } from '../../_constants/viewer-constants'
import type { PlaylistItem } from '../../_hooks/use-audio-playback'

interface PlaylistDrawerProps {
  /** Открыт ли drawer */
  open: boolean
  /** Callback закрытия */
  onClose: () => void
  /** Плейлист */
  playlist: PlaylistItem[]
  /** Текущий индекс */
  currentIndex: number
  /** Callback переключения трека */
  onTrackSelect: (index: number) => void
  /** Callback изменения порядка треков */
  onReorder: (playlist: PlaylistItem[]) => void
  /** Режим повтора */
  repeatMode: RepeatMode
  /** Callback переключения режима повтора */
  onToggleRepeat: () => void
  /** Включён ли shuffle */
  isShuffled: boolean
  /** Callback переключения shuffle */
  onToggleShuffle: () => void
}

/**
 * Иконка режима повтора
 */
function RepeatIcon({ mode }: { mode: RepeatMode }) {
  if (mode === 'one') {
    return <LuRepeat1 />
  }
  return <LuRepeat />
}

interface SortableTrackItemProps {
  track: PlaylistItem
  index: number
  isCurrent: boolean
  onSelect: () => void
}

/**
 * Сортируемый элемент трека
 */
function SortableTrackItem({ track, index, isCurrent, onSelect }: SortableTrackItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `${track.type}-${track.id}`,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
  }

  return (
    <Box
      ref={setNodeRef}
      style={style}
      px={4}
      py={3}
      cursor="pointer"
      bg={isCurrent ? 'purple.500/20' : isDragging ? 'whiteAlpha.100' : 'transparent'}
      borderLeft="3px solid"
      borderColor={isCurrent ? 'purple.500' : 'transparent'}
      _hover={{ bg: isCurrent ? 'purple.500/30' : 'whiteAlpha.100' }}
      onClick={onSelect}
      transition="background 0.15s"
    >
      <HStack gap={2}>
        {/* Drag handle */}
        <Box
          {...attributes}
          {...listeners}
          color="gray.500"
          cursor="grab"
          _active={{ cursor: 'grabbing' }}
          p={1}
          ml={-1}
          onClick={(e) => e.stopPropagation()}
        >
          <LuGripVertical size={16} />
        </Box>

        {/* Track number / equalizer */}
        <Box
          w="28px"
          h="28px"
          borderRadius="md"
          bg={isCurrent ? 'purple.500' : 'whiteAlpha.100'}
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
        >
          {isCurrent
            ? (
              <Box display="flex" gap="2px" alignItems="flex-end" h="12px">
                {[0, 1, 2].map((i) => (
                  <Box
                    key={i}
                    w="2px"
                    bg="white"
                    borderRadius="full"
                    animation={`equalizer 0.5s ease-in-out ${i * 0.1}s infinite alternate`}
                    h={`${6 + i * 2}px`}
                  />
                ))}
              </Box>
            )
            : (
              <Text fontSize="xs" color="gray.400">
                {index + 1}
              </Text>
            )}
        </Box>

        {/* Track name */}
        <VStack align="start" gap={0} flex={1} minW={0}>
          <Text
            fontSize="sm"
            fontWeight={isCurrent ? 'medium' : 'normal'}
            color={isCurrent ? 'white' : 'gray.300'}
            lineClamp={1}
          >
            {track.name}
          </Text>
          <Text fontSize="xs" color="gray.500">
            {track.type === 'builtin' ? 'Встроенный' : 'Мой трек'}
          </Text>
        </VStack>
      </HStack>
    </Box>
  )
}

/**
 * Выдвижной drawer с плейлистом.
 * Появляется снизу экрана, показывает список треков с drag-and-drop сортировкой.
 */
export function PlaylistDrawer({
  open,
  onClose,
  playlist,
  currentIndex,
  onTrackSelect,
  onReorder,
  repeatMode,
  onToggleRepeat,
  isShuffled,
  onToggleShuffle,
}: PlaylistDrawerProps) {
  const t = useTranslations('viewer.aria')
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor))

  /**
   * Обработчик завершения перетаскивания
   */
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      if (over && active.id !== over.id) {
        const oldIndex = playlist.findIndex((t) => `${t.type}-${t.id}` === active.id)
        const newIndex = playlist.findIndex((t) => `${t.type}-${t.id}` === over.id)

        if (oldIndex !== -1 && newIndex !== -1) {
          const newPlaylist = arrayMove(playlist, oldIndex, newIndex)
          onReorder(newPlaylist)
        }
      }
    },
    [playlist, onReorder],
  )

  // Уникальные ID для SortableContext
  const trackIds = playlist.map((t) => `${t.type}-${t.id}`)

  return (
    <Drawer.Root open={open} onOpenChange={(e) => !e.open && onClose()} placement="bottom">
      <Drawer.Backdrop bg="blackAlpha.600" backdropFilter="blur(4px)" zIndex={10200} />
      <Drawer.Positioner zIndex={10201}>
        <Drawer.Content
          bg="rgba(20, 20, 30, 0.95)"
          backdropFilter="blur(20px)"
          borderTopRadius="2xl"
          maxH="60vh"
          border="1px solid"
          borderColor="whiteAlpha.200"
          borderBottom="none"
        >
          {/* Header */}
          <Drawer.Header borderBottom="1px solid" borderColor="whiteAlpha.100" py={3} px={4}>
            <HStack justify="space-between" w="100%">
              <HStack gap={2}>
                <Box color="purple.400">
                  <LuMusic size={20} />
                </Box>
                <Drawer.Title fontSize="lg" fontWeight="semibold" color="white">
                  Плейлист
                </Drawer.Title>
                <Text fontSize="sm" color="gray.500">
                  ({playlist.length} треков)
                </Text>
              </HStack>

              <HStack gap={1}>
                {/* Repeat button */}
                <IconButton
                  aria-label={`Повтор: ${REPEAT_MODE_LABELS[repeatMode]}`}
                  size="sm"
                  variant="ghost"
                  colorPalette={repeatMode !== 'off' ? 'purple' : 'gray'}
                  opacity={repeatMode === 'off' ? 0.5 : 1}
                  onClick={onToggleRepeat}
                  title={REPEAT_MODE_LABELS[repeatMode]}
                >
                  <RepeatIcon mode={repeatMode} />
                </IconButton>

                {/* Shuffle button */}
                <IconButton
                  aria-label={isShuffled ? t('disableShuffle') : t('enableShuffle')}
                  size="sm"
                  variant="ghost"
                  colorPalette={isShuffled ? 'purple' : 'gray'}
                  opacity={isShuffled ? 1 : 0.5}
                  onClick={onToggleShuffle}
                >
                  <LuShuffle />
                </IconButton>

                {/* Close button */}
                <IconButton aria-label={t('close')} size="sm" variant="ghost" colorPalette="gray" onClick={onClose}>
                  <LuX />
                </IconButton>
              </HStack>
            </HStack>
          </Drawer.Header>

          {/* Body */}
          <Drawer.Body p={0} overflowY="auto">
            {playlist.length > 0
              ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={trackIds} strategy={verticalListSortingStrategy}>
                    <VStack align="stretch" gap={0}>
                      {playlist.map((track, index) => (
                        <SortableTrackItem
                          key={`${track.type}-${track.id}`}
                          track={track}
                          index={index}
                          isCurrent={index === currentIndex}
                          onSelect={() => onTrackSelect(index)}
                        />
                      ))}
                    </VStack>
                  </SortableContext>
                </DndContext>
              )
              : (
                <Box py={8} textAlign="center">
                  <Text color="gray.500">Нет доступных треков</Text>
                </Box>
              )}
          </Drawer.Body>

          {/* CSS для анимации эквалайзера */}
          <style jsx global>
            {`
              @keyframes equalizer {
                0% {
                  height: 4px;
                }
                100% {
                  height: 12px;
                }
              }
            `}
          </style>
        </Drawer.Content>
      </Drawer.Positioner>
    </Drawer.Root>
  )
}
