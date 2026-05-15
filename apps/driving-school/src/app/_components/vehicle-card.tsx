'use client'

import { VehiclePhotoPreview } from '@/app/_components/vehicles'
import { getVehiclePhotoUrl, type VehicleFileData } from '@/app/_types'
import { Badge, Card, HStack, IconButton, Text, VStack } from '@chakra-ui/react'
import { Tooltip } from '@letar/ui'
import { LuCamera, LuPencil, LuStar, LuTrash2 } from 'react-icons/lu'

// Реэкспорт типа для обратной совместимости
export type { VehicleFileData } from '@/app/_types'

export interface VehicleData {
  id: string
  brand: string
  model: string
  year: number | null
  color: string | null
  plateNumber: string | null
  transmission: 'MANUAL' | 'AUTOMATIC'
  isPrimary: boolean
  isActive: boolean
  photoUrl: string | null
  files: VehicleFileData[]
}

interface VehicleCardProps {
  vehicle: VehicleData
  onEdit: (vehicle: VehicleData) => void
  onDelete: (vehicleId: string) => void
  onSetPrimary: (vehicleId: string) => void
  onPhotos: (vehicle: VehicleData) => void
  disabled?: boolean
  /** Единственный автомобиль (нельзя удалить) */
  isOnly?: boolean
}

export function VehicleCard({ vehicle, onEdit, onDelete, onSetPrimary, onPhotos, disabled, isOnly }: VehicleCardProps) {
  const transmissionLabel = vehicle.transmission === 'MANUAL' ? 'МТ' : 'АТ'
  const canDelete = !vehicle.isPrimary && !isOnly

  // Определяем причину блокировки удаления
  const getDeleteTooltip = () => {
    if (isOnly) {
      return 'Нельзя удалить единственный автомобиль'
    }
    if (vehicle.isPrimary) {
      return 'Нельзя удалить основной автомобиль'
    }
    return 'Удалить автомобиль'
  }

  return (
    <Card.Root size="sm" variant={vehicle.isPrimary ? 'elevated' : 'outline'}>
      <Card.Body p={0}>
        {/* Ряд 1: КПП + Марка + Модель */}
        <HStack gap={2} flexWrap="wrap" alignItems={'flex-start'}>
          <Badge size="sm" colorPalette={vehicle.transmission === 'AUTOMATIC' ? 'blue' : 'gray'}>
            {transmissionLabel}
          </Badge>
          <Text flex={1} fontWeight="semibold" fontSize="md">
            {vehicle.brand} {vehicle.model}
          </Text>
          {/* Ряд 3: Кнопки */}
          <HStack gap={0} alignSelf={'flex-end'} justifySelf={'flex-end'}>
            {vehicle.isPrimary ? null : (
              <Tooltip content="Сделать основным">
                <IconButton
                  aria-label="Сделать основным"
                  size="xs"
                  variant="ghost"
                  colorPalette="brand"
                  onClick={() => onSetPrimary(vehicle.id)}
                  disabled={disabled}
                >
                  <LuStar />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip content={getDeleteTooltip()}>
              <IconButton
                aria-label="Удалить"
                size="xs"
                variant="ghost"
                colorPalette="red"
                onClick={() => canDelete && onDelete(vehicle.id)}
                disabled={disabled || !canDelete}
              >
                <LuTrash2 />
              </IconButton>
            </Tooltip>

            <Tooltip content="Редактировать">
              <IconButton
                aria-label="Редактировать"
                size="xs"
                variant="ghost"
                onClick={() => onEdit(vehicle)}
                disabled={disabled}
              >
                <LuPencil />
              </IconButton>
            </Tooltip>
            <Tooltip content="Фото">
              <IconButton
                aria-label="Фото"
                size="xs"
                variant="ghost"
                colorPalette={vehicle.files.length > 0 ? 'fg' : 'gray'}
                onClick={() => onPhotos(vehicle)}
                disabled={disabled}
              >
                <LuCamera />
                {vehicle.files.length > 0 && (
                  <Badge size="xs" position="absolute" top={-1} right={-1} colorPalette="brand" borderRadius="full">
                    {vehicle.files.length}
                  </Badge>
                )}
              </IconButton>
            </Tooltip>
          </HStack>
        </HStack>
        <HStack gap={0}>
          {/* Фото автомобиля 16:9 */}
          <VehiclePhotoPreview
            photoUrl={vehicle.photoUrl || getVehiclePhotoUrl(vehicle.files)}
            alt={`${vehicle.brand} ${vehicle.model}`}
            photoCount={vehicle.files.length}
            size="sm"
            borderRadius="md"
          />

          {/* Информация */}
          <HStack flex={1}>
            <VStack align="stretch" flex={1} pl={3} py={0} gap={2}>
              {/* Ряд 2: Номер + Цвет + Основной/Сделать основным */}
              <VStack gap={2} justifyContent={'space-between'} alignItems={'flex-start'}>
                {vehicle.plateNumber && (
                  <Text fontSize="sm" color="fg.muted">
                    {vehicle.plateNumber}
                  </Text>
                )}
                {vehicle.color && (
                  <Text fontSize="sm" color="fg.muted">
                    {vehicle.color}
                  </Text>
                )}
              </VStack>
              <HStack gap={2} justifyContent={'space-between'} alignItems={'flex-start'}>
                {vehicle.year && (
                  <Text fontSize="sm" color="fg.muted" textWrap={'nowrap'} flex={1}>
                    {vehicle.year} г.
                  </Text>
                )}
                {vehicle.isPrimary ? (
                  <Badge colorPalette="yellow" size="sm" alignSelf={'flex-end'} justifySelf={'flex-end'}>
                    <LuStar size={12} />
                    Основной
                  </Badge>
                ) : null}
              </HStack>
            </VStack>
          </HStack>
        </HStack>
      </Card.Body>
    </Card.Root>
  )
}
