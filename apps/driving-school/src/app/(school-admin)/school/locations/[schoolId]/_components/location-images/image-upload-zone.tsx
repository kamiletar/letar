'use client'

import { Box, Text } from '@chakra-ui/react'
import { forwardRef } from 'react'
import { LuUpload } from 'react-icons/lu'

interface ImageUploadZoneProps {
  isDragging: boolean
  onDrop: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onClick: () => void
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

/**
 * Зона drag-and-drop для загрузки изображений.
 */
export const ImageUploadZone = forwardRef<HTMLInputElement, ImageUploadZoneProps>(function ImageUploadZone(
  { isDragging, onDrop, onDragOver, onDragLeave, onClick, onInputChange },
  ref
) {
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
      onClick={onClick}
    >
      <input ref={ref} type="file" multiple accept="image/*" onChange={onInputChange} style={{ display: 'none' }} />
      <LuUpload size={24} style={{ margin: '0 auto 8px' }} />
      <Text fontSize="sm" fontWeight="medium" mb={1}>
        Перетащите фото или нажмите для выбора
      </Text>
      <Text fontSize="xs" color="fg.muted">
        JPG, PNG, WEBP (макс. 10MB)
      </Text>
    </Box>
  )
})
