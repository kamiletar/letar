'use client'

/**
 * Диалог обрезки фото инструктора
 *
 * @module photo-crop-dialog
 */

import { Box, Button, Dialog, Portal, Text } from '@chakra-ui/react'
import Cropper from 'react-easy-crop'

import { ASPECT_RATIO, CROP_HEIGHT, type PhotoCropDialogProps } from './instructor-photo.types'

/**
 * Диалог с кропером для обрезки фото
 */
export function PhotoCropDialog({
  open,
  onOpenChange,
  selectedImage,
  isUploading,
  onSave,
  onCancel,
  crop,
  onCropChange,
  zoom,
  onZoomChange,
  onCropComplete,
}: PhotoCropDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(e) => !isUploading && onOpenChange(e.open)}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="500px">
            <Dialog.Header>
              <Dialog.Title>Обрезка фото</Dialog.Title>
            </Dialog.Header>

            <Dialog.Body>
              {selectedImage && (
                <Box position="relative" height={`${CROP_HEIGHT}px`} bg="black" borderRadius="md" overflow="hidden">
                  <Cropper
                    image={selectedImage}
                    crop={crop}
                    zoom={zoom}
                    minZoom={1}
                    maxZoom={3}
                    aspect={ASPECT_RATIO}
                    cropShape="rect"
                    showGrid
                    restrictPosition={false}
                    objectFit="contain"
                    onCropChange={onCropChange}
                    onZoomChange={onZoomChange}
                    onCropComplete={onCropComplete}
                  />
                </Box>
              )}

              <Box mt={4}>
                <Text fontSize="sm" mb={2}>
                  Масштаб
                </Text>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => onZoomChange(parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
              </Box>
            </Dialog.Body>

            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline" onClick={onCancel} disabled={isUploading}>
                  Отмена
                </Button>
              </Dialog.ActionTrigger>
              <Button colorPalette="brand" onClick={onSave} loading={isUploading}>
                Сохранить
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
