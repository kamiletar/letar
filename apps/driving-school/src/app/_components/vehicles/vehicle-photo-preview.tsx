'use client'

import { AspectRatio, Box, Flex, Icon } from '@chakra-ui/react'
import Image from 'next/image'
import { LuCar, LuImage } from 'react-icons/lu'

export interface VehiclePhotoPreviewProps {
  /** URL фото для отображения */
  photoUrl: string | null
  /** Alt текст для изображения */
  alt: string
  /** Количество фото (для бейджа) */
  photoCount?: number
  /** Размер превью */
  size?: 'sm' | 'md'
  /** Скругление углов */
  borderRadius?: string
}

/**
 * Компонент превью фото автомобиля
 *
 * @example
 * ```tsx
 * // Компактный размер (для карточек в диалогах)
 * <VehiclePhotoPreview
 *   photoUrl={getVehiclePhotoUrl(vehicle.files)}
 *   alt={`${vehicle.brand} ${vehicle.model}`}
 *   photoCount={vehicle.files.length}
 *   size="sm"
 * />
 *
 * // Стандартный размер (для списков)
 * <VehiclePhotoPreview
 *   photoUrl={photoUrl}
 *   alt={`${vehicle.brand} ${vehicle.model}`}
 *   photoCount={3}
 *   size="md"
 * />
 * ```
 */
export function VehiclePhotoPreview({
  photoUrl,
  alt,
  photoCount = 0,
  size = 'md',
  borderRadius = 'md',
}: VehiclePhotoPreviewProps) {
  const showPhotoBadge = photoCount > 1

  // sm: 174px x 16:9 (для compact карточек)
  // md: 100px x 100px (для списков)
  if (size === 'sm') {
    return (
      <AspectRatio ratio={16 / 9} width="174px" flexShrink={0}>
        <Box bg="bg.muted" borderRadius={borderRadius} overflow="hidden" position="relative">
          {photoUrl ? (
            <>
              <Image src={photoUrl} alt={alt} fill style={{ objectFit: 'cover' }} sizes="174px" />
              {showPhotoBadge && <PhotoCountBadge count={photoCount} />}
            </>
          ) : (
            <Flex align="center" justify="center" w="100%" h="100%">
              <Icon as={LuCar} boxSize={8} color="fg.muted" />
            </Flex>
          )}
        </Box>
      </AspectRatio>
    )
  }

  // size === 'md'
  return (
    <Box
      width="100px"
      height="100px"
      borderRadius={borderRadius}
      overflow="hidden"
      flexShrink={0}
      bg="bg.muted"
      position="relative"
    >
      {photoUrl ? (
        <>
          <Image src={photoUrl} alt={alt} fill style={{ objectFit: 'cover' }} sizes="100px" />
          {showPhotoBadge && <PhotoCountBadge count={photoCount} />}
        </>
      ) : (
        <Flex align="center" justify="center" h="100%">
          <Icon as={LuCar} boxSize={8} color="fg.muted" />
        </Flex>
      )}
    </Box>
  )
}

/**
 * Бейдж с количеством фото
 */
function PhotoCountBadge({ count }: { count: number }) {
  return (
    <Box
      position="absolute"
      bottom={1}
      right={1}
      bg="blackAlpha.700"
      color="white"
      fontSize="xs"
      px={1.5}
      py={0.5}
      borderRadius="sm"
    >
      <Flex align="center" gap={1}>
        <Icon as={LuImage} boxSize={3} />
        {count}
      </Flex>
    </Box>
  )
}
