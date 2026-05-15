'use client'

/**
 * Компонент загрузки фото инструктора
 *
 * @module instructor-photo-upload
 *
 * Структура модуля:
 * - instructor-photo.types.ts — типы, константы и утилиты
 * - use-instructor-photo.ts — хук управления состоянием
 * - photo-crop-dialog.tsx — диалог обрезки
 */

import { AspectRatio, Box, Button, Center, Image, Spinner, Stack, Text } from '@chakra-ui/react'
import dynamic from 'next/dynamic'
import { LuCamera, LuTrash2, LuUpload, LuUser } from 'react-icons/lu'

import type { InstructorPhotoUploadProps } from './instructor-photo.types'
import { useInstructorPhoto } from './use-instructor-photo'

// Ленивая загрузка диалога обрезки — react-easy-crop загружается только при открытии
const PhotoCropDialog = dynamic(() => import('./photo-crop-dialog').then((mod) => ({ default: mod.PhotoCropDialog })), {
  ssr: false,
  loading: () => (
    <Center h="300px">
      <Spinner size="lg" colorPalette="brand" />
    </Center>
  ),
})

/**
 * Компонент загрузки фото инструктора (прямоугольное, как в паспорте).
 * Aspect ratio 3:4 для портретной ориентации.
 * Поддерживает drag-and-drop и кроппинг.
 */
export function InstructorPhotoUpload({ currentPhotoUrl, instructorName, onPhotoChange }: InstructorPhotoUploadProps) {
  const {
    photoUrl,
    selectedImage,
    crop,
    zoom,
    isUploading,
    isDeleting,
    dialogOpen,
    isDragging,
    fileInputRef,
    dropZoneRef,
    setCrop,
    setZoom,
    setDialogOpen,
    onCropComplete,
    handleFileSelect,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleSave,
    handleDelete,
    handleCancel,
  } = useInstructorPhoto({ currentPhotoUrl, onPhotoChange })

  return (
    <Box>
      {/* Drop zone */}
      <Box
        ref={dropZoneRef}
        position="relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        p={4}
        borderRadius="lg"
        borderWidth="2px"
        borderStyle="dashed"
        borderColor={isDragging ? 'fg.500' : 'transparent'}
        bg={isDragging ? 'fg.muted/10' : 'transparent'}
        transition="all 0.2s"
      >
        <Stack direction={{ base: 'column', sm: 'row' }} align="flex-start" gap={4}>
          {/* Превью фото - прямоугольное 3:4 */}
          <Box
            onClick={() => fileInputRef.current?.click()}
            cursor="pointer"
            borderRadius="md"
            overflow="hidden"
            transition="all 0.2s"
            _hover={{ opacity: 0.8 }}
            w={{ base: '120px', sm: '150px' }}
            flexShrink={0}
          >
            <AspectRatio ratio={3 / 4}>
              {photoUrl ? (
                <Image src={photoUrl} alt={instructorName} objectFit="cover" />
              ) : (
                <Box bg="bg.muted" display="flex" alignItems="center" justifyContent="center">
                  <LuUser size={48} color="var(--chakra-colors-fg-muted)" />
                </Box>
              )}
            </AspectRatio>
          </Box>

          <Stack gap={2} flex={1}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            <Button onClick={() => fileInputRef.current?.click()} colorPalette="brand" size="sm">
              <LuCamera />
              {photoUrl ? 'Изменить фото' : 'Загрузить фото'}
            </Button>

            {photoUrl && (
              <Button onClick={handleDelete} colorPalette="red" variant="outline" size="sm" loading={isDeleting}>
                <LuTrash2 />
                Удалить
              </Button>
            )}

            <Text fontSize="sm" color="fg.muted">
              Фото в формате паспорта (3:4).
              <br />
              JPG, PNG или GIF. Максимум 5MB.
              <br />
              Перетащите изображение сюда.
            </Text>
          </Stack>
        </Stack>

        {/* Overlay при перетаскивании */}
        {isDragging && (
          <Box
            position="absolute"
            inset={0}
            bg="blackAlpha.500"
            borderRadius="lg"
            display="flex"
            alignItems="center"
            justifyContent="center"
            pointerEvents="none"
          >
            <Stack align="center" gap={2}>
              <LuUpload color="white" size={32} />
              <Text color="white" fontWeight="medium">
                Отпустите для загрузки
              </Text>
            </Stack>
          </Box>
        )}
      </Box>

      {/* Диалог с кропером */}
      <PhotoCropDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        selectedImage={selectedImage}
        isUploading={isUploading}
        onSave={handleSave}
        onCancel={handleCancel}
        crop={crop}
        onCropChange={setCrop}
        zoom={zoom}
        onZoomChange={setZoom}
        onCropComplete={onCropComplete}
      />
    </Box>
  )
}
