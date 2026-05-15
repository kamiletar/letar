'use client'

import {
  createVehicleAction,
  deleteVehicleAction,
  setPrimaryVehicleAction,
  updateVehicleAction,
} from '@/app/(instructor)/instructor-profile/_actions/vehicle.action'
import { toaster } from '@/app/_components/ui/toaster'
import { VehicleCard, type VehicleData } from '@/app/_components/vehicle-card'
import { type VehicleFormData, VehicleFormDialog } from '@/app/_components/vehicle-form-dialog'
import { VehiclePhotosDialog } from '@/app/_components/vehicle-photos-dialog'
import { Box, Button, Heading, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { LuPlus } from 'react-icons/lu'

interface VehiclesManagerProps {
  vehicles: VehicleData[]
  maxVehicles?: number
}

export function VehiclesManager({ vehicles, maxVehicles = 5 }: VehiclesManagerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<VehicleData | null>(null)
  const [photosDialogOpen, setPhotosDialogOpen] = useState(false)
  const [photosVehicle, setPhotosVehicle] = useState<VehicleData | null>(null)

  // Синхронизировать editingVehicle и photosVehicle при обновлении vehicles (после router.refresh)
  // Намеренно не включаем editingVehicle и photosVehicle в зависимости, чтобы избежать бесконечного цикла
  useEffect(() => {
    if (editingVehicle) {
      const updated = vehicles.find((v) => v.id === editingVehicle.id)
      if (updated) {
        setEditingVehicle(updated)
      }
    }
    if (photosVehicle) {
      const updated = vehicles.find((v) => v.id === photosVehicle.id)
      if (updated) {
        setPhotosVehicle(updated)
      }
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- editingVehicle и photosVehicle исключены намеренно
  }, [vehicles])

  const handleAdd = () => {
    setEditingVehicle(null)
    setDialogOpen(true)
  }

  const handleEdit = (vehicle: VehicleData) => {
    setEditingVehicle(vehicle)
    setDialogOpen(true)
  }

  const handlePhotos = (vehicle: VehicleData) => {
    setPhotosVehicle(vehicle)
    setPhotosDialogOpen(true)
  }

  const handleDelete = (vehicleId: string) => {
    // Подтверждение удаления
    if (!window.confirm('Вы уверены, что хотите удалить этот автомобиль?')) {
      return
    }

    startTransition(async () => {
      const result = await deleteVehicleAction(vehicleId)
      if (result.success) {
        toaster.success({ title: 'Автомобиль удалён' })
        router.refresh()
      } else {
        toaster.error({ title: 'Ошибка', description: result.error })
      }
    })
  }

  const handleSetPrimary = (vehicleId: string) => {
    startTransition(async () => {
      const result = await setPrimaryVehicleAction(vehicleId)
      if (result.success) {
        toaster.success({ title: 'Основной автомобиль изменён' })
        router.refresh()
      } else {
        toaster.error({ title: 'Ошибка', description: result.error })
      }
    })
  }

  const handleSubmit = async (data: VehicleFormData) => {
    startTransition(async () => {
      const result = data.id ? await updateVehicleAction(data) : await createVehicleAction(data)

      if (result.success) {
        toaster.success({ title: data.id ? 'Автомобиль обновлён' : 'Автомобиль добавлен' })
        setDialogOpen(false)
        router.refresh()
      } else {
        toaster.error({ title: 'Ошибка', description: result.error })
      }
    })
  }

  // Сортируем: primary первый
  const sortedVehicles = [...vehicles].sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0))

  return (
    <Box>
      <Heading size="md" mb={4}>
        Автомобили
      </Heading>

      <VStack gap={3} align="stretch">
        {sortedVehicles.length === 0 ? (
          <Text color="fg.muted" fontSize="sm">
            У вас ещё нет добавленных автомобилей
          </Text>
        ) : (
          sortedVehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onSetPrimary={handleSetPrimary}
              onPhotos={handlePhotos}
              disabled={isPending}
              isOnly={sortedVehicles.length === 1}
            />
          ))
        )}

        {vehicles.length < maxVehicles && (
          <Button variant="outline" colorPalette="brand" onClick={handleAdd} disabled={isPending}>
            <LuPlus />
            Добавить автомобиль
          </Button>
        )}

        {vehicles.length >= maxVehicles && (
          <Text color="fg.muted" fontSize="sm">
            Максимум {maxVehicles} автомобилей
          </Text>
        )}
      </VStack>

      <VehicleFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        vehicle={editingVehicle}
        onSubmit={handleSubmit}
        onPhotos={handlePhotos}
        isPending={isPending}
      />

      <VehiclePhotosDialog
        open={photosDialogOpen}
        onOpenChange={setPhotosDialogOpen}
        vehicle={photosVehicle}
        onPhotosChanged={() => {
          // Данные обновятся автоматически через useEffect при изменении vehicles
        }}
      />
    </Box>
  )
}
