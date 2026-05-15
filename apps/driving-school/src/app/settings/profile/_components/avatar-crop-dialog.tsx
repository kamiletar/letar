'use client'

/**
 * Диалог обрезки аватара
 * Выделен для ленивой загрузки react-easy-crop
 */

import { Box, Button, Dialog, Portal, Text } from '@chakra-ui/react'
import type { Area, Point } from 'react-easy-crop'
import Cropper from 'react-easy-crop'

interface AvatarCropDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedImage: string | null
  crop: Point
  onCropChange: (crop: Point) => void
  zoom: number
  onZoomChange: (zoom: number) => void
  onCropComplete: (croppedArea: Area, croppedAreaPixels: Area) => void
  isUploading: boolean
  onSave: () => void
  onCancel: () => void
}

export function AvatarCropDialog({
  open,
  onOpenChange,
  selectedImage,
  crop,
  onCropChange,
  zoom,
  onZoomChange,
  onCropComplete,
  isUploading,
  onSave,
  onCancel,
}: AvatarCropDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(e) => !isUploading && onOpenChange(e.open)}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="600px">
            <Dialog.Header>
              <Dialog.Title>Обрезка изображения</Dialog.Title>
            </Dialog.Header>

            <Dialog.Body>
              {selectedImage && (
                <Box position="relative" height="400px" bg="bg.subtle" borderRadius="md">
                  <Cropper
                    image={selectedImage}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    cropShape="round"
                    showGrid={false}
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
