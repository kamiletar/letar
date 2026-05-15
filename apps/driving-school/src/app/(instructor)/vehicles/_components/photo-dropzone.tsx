'use client'

/**
 * Зона для загрузки фотографий (drag and drop)
 */

import { Box, Text } from '@chakra-ui/react'
import { LuUpload } from 'react-icons/lu'

interface PhotoDropzoneProps {
  /** Флаг перетаскивания над зоной */
  isDragging: boolean
  /** Осталось слотов для загрузки */
  remainingSlots: number
  /** Ref для input элемента */
  inputRef: React.RefObject<HTMLInputElement | null>
  /** Обработчик drop */
  onDrop: (e: React.DragEvent) => void
  /** Обработчик dragOver */
  onDragOver: (e: React.DragEvent) => void
  /** Обработчик dragLeave */
  onDragLeave: () => void
  /** Обработчик изменения input */
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

/**
 * Dropzone для загрузки фотографий
 */
export function PhotoDropzone({
  isDragging,
  remainingSlots,
  inputRef,
  onDrop,
  onDragOver,
  onDragLeave,
  onInputChange,
}: PhotoDropzoneProps) {
  return (
    <Box
      borderWidth="2px"
      borderStyle="dashed"
      borderColor={isDragging ? 'brand.solid' : 'border'}
      borderRadius="md"
      p={6}
      textAlign="center"
      bg={isDragging ? 'brand.subtle' : 'transparent'}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      cursor="pointer"
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={onInputChange}
        style={{ display: 'none' }}
      />
      <LuUpload size={24} style={{ margin: '0 auto 8px' }} />
      <Text fontSize="sm" fontWeight="medium" mb={1}>
        Перетащите фото или нажмите для выбора
      </Text>
      <Text fontSize="xs" color="fg.muted">
        JPG, PNG, WEBP (макс. 10MB) • Осталось: {remainingSlots}
      </Text>
    </Box>
  )
}
