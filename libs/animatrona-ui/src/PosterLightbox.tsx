'use client'

/**
 * Модальное окно для просмотра постера в полном размере
 */

import { CloseButton, Dialog, Image, Portal } from '@chakra-ui/react'

export interface PosterLightboxProps {
  /** URL постера */
  posterUrl: string
  /** Название аниме (для alt) */
  name: string
  /** Открыт ли лайтбокс */
  open: boolean
  /** Callback закрытия */
  onOpenChange: (open: boolean) => void
}

/** Лайтбокс для просмотра постера в полном размере */
export function PosterLightbox({ posterUrl, name, open, onOpenChange }: PosterLightboxProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
      size="cover"
      placement="center"
      motionPreset="scale"
    >
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.900" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="transparent"
            shadow="none"
            maxW="90vw"
            maxH="90vh"
            p={0}
            onClick={() => onOpenChange(false)}
          >
            <Dialog.CloseTrigger asChild position="fixed" top={4} right={4}>
              <CloseButton size="lg" colorPalette="whiteAlpha" bg="blackAlpha.600" _hover={{ bg: 'blackAlpha.700' }} />
            </Dialog.CloseTrigger>
            <Image
              src={posterUrl}
              maxH="90vh"
              maxW="90vw"
              objectFit="contain"
              borderRadius="lg"
              shadow="2xl"
              alt={name}
            />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
