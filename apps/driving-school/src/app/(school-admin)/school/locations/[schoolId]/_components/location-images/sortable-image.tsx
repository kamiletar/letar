'use client'

import { Box, IconButton } from '@chakra-ui/react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Image from 'next/image'
import { LuTrash2 } from 'react-icons/lu'

import type { LocationFileWithFile } from './types'

/**
 * Получает URL файла из пути.
 */
function getFileUrl(path: string): string {
  return `/api/files/${path}`
}

interface SortableImageProps {
  locationFile: LocationFileWithFile
  onDelete: () => void
}

/**
 * Компонент одного изображения с возможностью сортировки.
 */
export function SortableImage({ locationFile, onDelete }: SortableImageProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: locationFile.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const imageUrl = getFileUrl(locationFile.file.path)

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      position="relative"
      borderWidth="2px"
      borderColor={isDragging ? 'brand.solid' : 'border'}
      borderRadius="md"
      overflow="hidden"
      cursor="grab"
      _active={{ cursor: 'grabbing' }}
      width="150px"
      height="150px"
    >
      <Image
        src={imageUrl}
        alt={locationFile.alt || 'Фото филиала'}
        fill
        style={{ objectFit: 'cover' }}
        sizes="150px"
      />
      <IconButton
        position="absolute"
        top={1}
        right={1}
        size="xs"
        colorPalette="red"
        variant="solid"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="Удалить изображение"
        zIndex={2}
      >
        <LuTrash2 />
      </IconButton>
      <Box
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        bg="blackAlpha.700"
        color="white"
        fontSize="xs"
        textAlign="center"
        py={1}
        zIndex={1}
      >
        #{locationFile.order + 1}
      </Box>
    </Box>
  )
}
