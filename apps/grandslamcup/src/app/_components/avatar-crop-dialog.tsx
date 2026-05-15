'use client'

/**
 * Диалог обрезки аватара.
 * Круглый кроп для игроков, квадратный для команд.
 */

import { Box, Button, Dialog, Portal, Text } from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import type { Area, Point } from 'react-easy-crop'
import Cropper from 'react-easy-crop'

interface AvatarCropDialogProps {
  /** Data URL выбранного изображения */
  imageSrc: string
  /** Колбэк после обрезки — возвращает Blob */
  onCrop: (blob: Blob) => void
  /** Колбэк отмены */
  onCancel: () => void
  /** Открыт ли диалог */
  open: boolean
  /** Форма кропа: rect (квадрат) по умолчанию */
  cropShape?: 'round' | 'rect'
}

/** Вырезает область из изображения через canvas */
async function getCroppedImage(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = new Image()
  image.src = imageSrc
  await new Promise<void>((resolve) => {
    image.onload = () => resolve()
  })

  const canvas = document.createElement('canvas')
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  const ctx = canvas.getContext('2d')!

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Не удалось обрезать изображение'))
      },
      'image/jpeg',
      0.9
    )
  })
}

export function AvatarCropDialog({ imageSrc, onCrop, onCancel, open, cropShape = 'rect' }: AvatarCropDialogProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  const handleCropComplete = useCallback((_croppedArea: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  const handleSave = useCallback(async () => {
    if (!croppedAreaPixels) return
    const blob = await getCroppedImage(imageSrc, croppedAreaPixels)
    onCrop(blob)
  }, [croppedAreaPixels, imageSrc, onCrop])

  return (
    <Dialog.Root open={open} onOpenChange={(e) => !e.open && onCancel()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="600px">
            <Dialog.Header>
              <Dialog.Title>Обрезка фото</Dialog.Title>
            </Dialog.Header>

            <Dialog.Body>
              <Box position="relative" height="400px" bg="bg.subtle" borderRadius="md">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  minZoom={0.8}
                  maxZoom={2.5}
                  aspect={1}
                  cropShape={cropShape}
                  showGrid={false}
                  objectFit="contain"
                  restrictPosition={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={handleCropComplete}
                />
              </Box>

              <Box mt={4}>
                <Text fontSize="sm" mb={2}>
                  Масштаб
                </Text>
                <input
                  type="range"
                  min={0.8}
                  max={2.5}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
              </Box>
            </Dialog.Body>

            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline" onClick={onCancel}>
                  Отмена
                </Button>
              </Dialog.ActionTrigger>
              <Button colorPalette="brand" onClick={handleSave}>
                Обрезать
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
