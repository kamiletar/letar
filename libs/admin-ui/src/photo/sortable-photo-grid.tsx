'use client'

import { Badge, Box, Grid, IconButton, Input, SimpleGrid, type SimpleGridProps, Text } from '@chakra-ui/react'
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { arrayMove, rectSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Image from 'next/image'
import { useEffect, useState, useTransition } from 'react'
import { PiDotsSixVertical, PiStar, PiStarFill, PiTrash } from 'react-icons/pi'

export interface SortablePhotoItem {
  id: string
  imageUrl: string
  alt?: string
}

export interface SortablePhotoGridProps {
  /** Фото в текущем порядке — первое считается главным (cover) */
  items: SortablePhotoItem[]
  /** Сохранить новый порядок после drag&drop. Верни `{ error }`, если не удалось. */
  onReorder: (orderedIds: string[]) => Promise<{ error?: string }>
  /** Поставить фото первым в один клик. Если не передано — кнопка не показывается. */
  onSetCover?: (id: string) => Promise<{ error?: string }>
  /** Удалить фото. */
  onDelete: (id: string) => Promise<{ error?: string }>
  /** Сохранить alt-текст фото. Если не передано — поле не показывается. */
  onEditAlt?: (id: string, alt: string) => Promise<{ error?: string }>
  /** Вызывается после любой успешной мутации — обычно `router.refresh()`. */
  onChanged?: () => void
  columns?: SimpleGridProps['columns']
  colorPalette?: string
  /** `sizes` для next/image превью */
  imageSizes?: string
}

/**
 * Сетка фото с drag&drop-сортировкой (@dnd-kit, мышь/тач/клавиатура), опциональной
 * кнопкой «Сделать главной» (первое фото в порядке считается cover) и опциональным
 * полем alt-текста под каждой карточкой.
 *
 * Загрузку файлов и сам список фото (source of truth) держит вызывающий компонент —
 * эта сетка только сортирует/удаляет/помечает главное/правит alt через переданные экшны.
 */
export function SortablePhotoGrid({
  items,
  onReorder,
  onSetCover,
  onDelete,
  onEditAlt,
  onChanged,
  columns = { base: 2, sm: 3, md: 4 },
  colorPalette = 'brand',
  imageSizes = '200px',
}: SortablePhotoGridProps) {
  const [photos, setPhotos] = useState(items)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Синхронизация после внешнего обновления списка (например router.refresh())
  useEffect(() => {
    setPhotos(items)
  }, [items])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  )

  function handleDelete(id: string) {
    setError(null)
    startTransition(async () => {
      const result = await onDelete(id)
      if (result.error) {
        setError(result.error)
        return
      }
      onChanged?.()
    })
  }

  function handleSetCover(id: string) {
    if (!onSetCover) {
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await onSetCover(id)
      if (result.error) {
        setError(result.error)
        return
      }
      onChanged?.()
    })
  }

  function handleEditAlt(id: string, alt: string) {
    if (!onEditAlt) {
      return
    }
    setError(null)
    const previous = photos
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, alt } : p))) // оптимистичное обновление

    startTransition(async () => {
      const result = await onEditAlt(id, alt)
      if (result.error) {
        setError(result.error)
        setPhotos(previous) // откат
        return
      }
      onChanged?.()
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = photos.findIndex((p) => p.id === active.id)
    const newIndex = photos.findIndex((p) => p.id === over.id)
    const reordered = arrayMove(photos, oldIndex, newIndex)

    setError(null)
    setPhotos(reordered) // оптимистичное обновление

    startTransition(async () => {
      const result = await onReorder(reordered.map((p) => p.id))
      if (result.error) {
        setError(result.error)
        setPhotos(items) // откат
        return
      }
      onChanged?.()
    })
  }

  return (
    <Box>
      {error && (
        <Text color="fg.error" fontSize="sm" mb={3}>
          {error}
        </Text>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
          <SimpleGrid columns={columns} gap={4}>
            {photos.map((photo, index) => (
              <SortablePhotoCard
                key={photo.id}
                photo={photo}
                isCover={index === 0}
                isPending={isPending}
                showCoverButton={!!onSetCover}
                showAltInput={!!onEditAlt}
                colorPalette={colorPalette}
                imageSizes={imageSizes}
                onSetCover={() => handleSetCover(photo.id)}
                onDelete={() => handleDelete(photo.id)}
                onEditAlt={(alt) => handleEditAlt(photo.id, alt)}
              />
            ))}
          </SimpleGrid>
        </SortableContext>
      </DndContext>
    </Box>
  )
}

interface SortablePhotoCardProps {
  photo: SortablePhotoItem
  isCover: boolean
  isPending: boolean
  showCoverButton: boolean
  showAltInput: boolean
  colorPalette: string
  imageSizes: string
  onSetCover: () => void
  onDelete: () => void
  onEditAlt: (alt: string) => void
}

function SortablePhotoCard({
  photo,
  isCover,
  isPending,
  showCoverButton,
  showAltInput,
  colorPalette,
  imageSizes,
  onSetCover,
  onDelete,
  onEditAlt,
}: SortablePhotoCardProps) {
  const [altDraft, setAltDraft] = useState(photo.alt ?? '')

  useEffect(() => {
    setAltDraft(photo.alt ?? '')
  }, [photo.alt])
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: photo.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Box
      ref={setNodeRef}
      style={style}
      borderWidth="1px"
      borderColor={isCover ? `${colorPalette}.500` : 'border'}
      borderRadius="lg"
      overflow="hidden"
      bg="bg.panel"
    >
      <Box position="relative" aspectRatio={4 / 3}>
        <Image src={photo.imageUrl} alt={photo.alt ?? ''} fill sizes={imageSizes} style={{ objectFit: 'cover' }} />
        {isCover && (
          <Badge position="absolute" top={1} left={1} colorPalette={colorPalette} size="sm">
            Главное
          </Badge>
        )}
        <Box
          {...attributes}
          {...listeners}
          position="absolute"
          top={1}
          right={1}
          bg="bg.panel"
          borderRadius="md"
          p={1}
          cursor="grab"
          touchAction="none"
          _active={{ cursor: 'grabbing' }}
          aria-label="Перетащить для сортировки"
          role="button"
          tabIndex={0}
        >
          <PiDotsSixVertical size={18} />
        </Box>
      </Box>
      <Grid templateColumns={showCoverButton ? '1fr 1fr' : '1fr'} gap={1} p={1}>
        {showCoverButton && (
          <IconButton
            aria-label={isCover ? 'Уже главное фото' : 'Сделать главной'}
            size="xs"
            variant="ghost"
            colorPalette={isCover ? colorPalette : undefined}
            disabled={isPending || isCover}
            onClick={onSetCover}
          >
            {isCover ? <PiStarFill /> : <PiStar />}
          </IconButton>
        )}
        <IconButton
          aria-label="Удалить"
          size="xs"
          variant="ghost"
          colorPalette="red"
          disabled={isPending}
          onClick={onDelete}
        >
          <PiTrash />
        </IconButton>
      </Grid>
      {showAltInput && (
        <Box px={1} pb={1}>
          <Input
            size="2xs"
            placeholder="Alt-текст"
            value={altDraft}
            disabled={isPending}
            onChange={(e) => setAltDraft(e.target.value)}
            onBlur={() => {
              if (altDraft !== (photo.alt ?? '')) {
                onEditAlt(altDraft)
              }
            }}
          />
        </Box>
      )}
    </Box>
  )
}
