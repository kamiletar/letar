'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { VehiclePhotoPreview } from '@/app/_components/vehicles'
import { Badge, Button, Card, Flex, HStack, Icon, Stack, Text } from '@chakra-ui/react'
import { TransmissionTypeLabels } from '@letar/driving-school-db/form-schemas/enums/TransmissionType.form'
import { ConfirmDialog } from '@letar/ui'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { LuCheck, LuPencil, LuStar, LuTrash2, LuUndo2, LuWrench } from 'react-icons/lu'
import type { VehicleData } from '../_actions/vehicle.action'
import { deleteVehicle, restoreVehicle, setPrimaryVehicle } from '../_actions/vehicle.action'

interface VehicleCardProps {
  vehicle: VehicleData
}

export function VehicleCard({ vehicle }: VehicleCardProps) {
  const [isPending, startTransition] = useTransition()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteVehicle(vehicle.id)
      if (result.success) {
        toaster.success({ title: 'Автомобиль деактивирован' })
      } else {
        toaster.error({ title: result.error })
      }
      setIsDeleteDialogOpen(false)
    })
  }

  const handleRestore = () => {
    startTransition(async () => {
      const result = await restoreVehicle(vehicle.id)
      if (result.success) {
        toaster.success({ title: 'Автомобиль восстановлен' })
      } else {
        toaster.error({ title: result.error })
      }
    })
  }

  const handleSetPrimary = () => {
    startTransition(async () => {
      const result = await setPrimaryVehicle(vehicle.id)
      if (result.success) {
        toaster.success({ title: 'Установлен как основной' })
      } else {
        toaster.error({ title: result.error })
      }
    })
  }

  const isDisabled = !vehicle.isActive
  const isUnavailable = !vehicle.isAvailable

  // Первое фото для превью
  const firstPhoto = vehicle.files?.[0]
  const photoUrl = firstPhoto ? `/api/files/${firstPhoto.file.path}` : null
  const photoCount = vehicle.files?.length ?? 0

  return (
    <>
      <Card.Root
        opacity={isDisabled ? 0.6 : 1}
        borderColor={vehicle.isPrimary ? 'fg.solid' : undefined}
        borderWidth={vehicle.isPrimary ? '2px' : '1px'}
      >
        <Card.Body>
          <Flex gap={4}>
            {/* Превью фото */}
            <VehiclePhotoPreview
              photoUrl={photoUrl}
              alt={`${vehicle.brand} ${vehicle.model}`}
              photoCount={photoCount}
              size="md"
            />

            <Stack gap={2} flex={1}>
              {/* Ряд 1: КПП + Марка + Модель */}
              <HStack gap={3} flexWrap="wrap">
                <Badge colorPalette={vehicle.transmission === 'AUTOMATIC' ? 'blue' : 'gray'}>
                  {TransmissionTypeLabels[vehicle.transmission]}
                </Badge>
                <Text fontWeight="bold" fontSize="lg">
                  {vehicle.brand} {vehicle.model}
                </Text>
                {vehicle.year && (
                  <Text color="fg.muted" fontSize="sm">
                    {vehicle.year} г.
                  </Text>
                )}
              </HStack>

              {/* Ряд 2: Номер + Основной/Сделать основным */}
              <HStack gap={3} flexWrap="wrap">
                {vehicle.plateNumber && (
                  <Text color="fg.muted" fontSize="sm" fontFamily="mono">
                    {vehicle.plateNumber}
                  </Text>
                )}
                {vehicle.color && (
                  <Text color="fg.muted" fontSize="sm">
                    {vehicle.color}
                  </Text>
                )}
                {vehicle.isPrimary ? (
                  <Badge colorPalette="yellow" size="sm">
                    <Icon as={LuStar} boxSize={3} mr={1} />
                    Основной
                  </Badge>
                ) : (
                  vehicle.isActive && (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={handleSetPrimary}
                      disabled={isPending}
                      title="Сделать основным"
                    >
                      <Icon as={LuStar} boxSize={3} />
                      Сделать основным
                    </Button>
                  )
                )}
              </HStack>

              {/* Категории */}
              {vehicle.licenseCategories.length > 0 && (
                <Flex gap={1} flexWrap="wrap">
                  {vehicle.licenseCategories.map((cat) => (
                    <Badge key={cat} size="xs" variant="outline">
                      {cat}
                    </Badge>
                  ))}
                </Flex>
              )}

              {/* Статусы */}
              <HStack gap={2}>
                {!vehicle.isActive && (
                  <Badge colorPalette="red" size="sm">
                    Неактивен
                  </Badge>
                )}
                {isUnavailable && (
                  <Badge colorPalette="orange" size="sm">
                    <Icon as={LuWrench} boxSize={3} mr={1} />
                    Недоступен
                  </Badge>
                )}
                {vehicle.isActive && vehicle.isAvailable && (
                  <Badge colorPalette="green" size="sm">
                    <Icon as={LuCheck} boxSize={3} mr={1} />
                    Готов к работе
                  </Badge>
                )}
              </HStack>

              {/* Причина недоступности */}
              {isUnavailable && vehicle.unavailableReason && (
                <Text fontSize="sm" color="orange.fg">
                  {vehicle.unavailableReason}
                </Text>
              )}

              {/* Ряд 3: Кнопки действий */}
              <HStack gap={2} mt={1}>
                <Button asChild variant="outline" size="xs" disabled={isPending}>
                  <Link href={`/vehicles/${vehicle.id}/edit`}>
                    <Icon as={LuPencil} boxSize={3} />
                    Редактировать
                  </Link>
                </Button>

                {vehicle.isActive ? (
                  <Button
                    variant="ghost"
                    size="xs"
                    colorPalette="red"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    disabled={isPending}
                  >
                    <Icon as={LuTrash2} boxSize={3} />
                    Деактивировать
                  </Button>
                ) : (
                  <Button variant="ghost" size="xs" colorPalette="green" onClick={handleRestore} disabled={isPending}>
                    <Icon as={LuUndo2} boxSize={3} />
                    Восстановить
                  </Button>
                )}
              </HStack>
            </Stack>
          </Flex>
        </Card.Body>
      </Card.Root>

      {/* Диалог подтверждения деактивации */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Деактивировать автомобиль?"
        description={`Автомобиль "${vehicle.brand} ${vehicle.model}" будет деактивирован. Вы сможете восстановить его позже.`}
        confirmText="Деактивировать"
        colorPalette="red"
        isPending={isPending}
        closeOnConfirm={false}
      />
    </>
  )
}
