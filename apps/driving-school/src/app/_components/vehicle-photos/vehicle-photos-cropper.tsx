'use client'

/**
 * Диалог обрезки изображения для фотографий автомобилей
 *
 * Выделен из vehicle-photos-dialog.tsx для переиспользуемости
 */

import { toaster } from '@/app/_components/ui/toaster'
import { Box, Button, CloseButton, Dialog, HStack, Portal, Slider, Text } from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import type { Area } from 'react-easy-crop'
import Cropper from 'react-easy-crop'
import { LuCheck, LuMinus, LuPlus, LuX } from 'react-icons/lu'
import { ASPECT_RATIO, CROP_HEIGHT, getCroppedImg, type UploadedFile } from './vehicle-photo-utils'

interface VehiclePhotosCropperProps {
  imageSrc: string
  fileName: string
  onConfirm: (file: UploadedFile) => void
  onCancel: () => void
}

export function VehiclePhotosCropper({ imageSrc, fileName, onConfirm, onCancel }: VehiclePhotosCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleConfirm = async () => {
    if (!croppedAreaPixels) {
      return
    }

    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels)
      const croppedFile = new File([croppedBlob], fileName, { type: 'image/jpeg' })

      const uploadedFile: UploadedFile = {
        file: croppedFile,
        preview: URL.createObjectURL(croppedBlob),
        status: 'pending',
      }

      onConfirm(uploadedFile)
    } catch (error) {
      toaster.error({ title: 'Ошибка обработки изображения' })
      console.error('Crop error:', error)
    }
  }

  return (
    <Dialog.Root open={true} onOpenChange={() => onCancel()} placement="center" size="lg">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="xl">
            <Dialog.Header>
              <Dialog.Title>Обрезать изображение (16:9)</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>

            <Dialog.Body>
              <Box position="relative" width="100%" height={`${CROP_HEIGHT}px`} bg="black" borderRadius="md">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={ASPECT_RATIO}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  cropSize={{ width: CROP_HEIGHT * ASPECT_RATIO, height: CROP_HEIGHT }}
                  objectFit="cover"
                  minZoom={1}
                  maxZoom={3}
                />
              </Box>

              {/* Zoom slider */}
              <HStack gap={3} mt={4}>
                <LuMinus size={16} />
                <Slider.Root
                  min={1}
                  max={3}
                  step={0.1}
                  value={[zoom]}
                  onValueChange={(details) => setZoom(details.value[0])}
                  flex={1}
                >
                  <Slider.Control>
                    <Slider.Track>
                      <Slider.Range />
                    </Slider.Track>
                    <Slider.Thumb index={0} />
                  </Slider.Control>
                </Slider.Root>
                <LuPlus size={16} />
              </HStack>

              <Text fontSize="xs" color="fg.muted" mt={2} textAlign="center">
                Перетащите изображение для позиционирования
              </Text>
            </Dialog.Body>

            <Dialog.Footer>
              <Button variant="outline" onClick={onCancel}>
                <LuX />
                Отмена
              </Button>
              <Button colorPalette="brand" onClick={handleConfirm}>
                <LuCheck />
                Применить
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
