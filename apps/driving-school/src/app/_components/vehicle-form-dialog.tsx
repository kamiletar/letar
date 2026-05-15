'use client'

import type { VehicleData } from '@/app/_components/vehicle-card'
import { InputPlateNumber } from '@/driving-school-form'
import { Box, Button, CloseButton, Dialog, Field, Grid, HStack, Input, Portal, Text, VStack } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { LuCamera, LuCar, LuSave } from 'react-icons/lu'

/**
 * Иконка механической коробки передач (H-pattern)
 */
function ManualIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="6" y1="6" x2="6" y2="18" />
      <line x1="12" y1="6" x2="12" y2="18" />
      <line x1="18" y1="6" x2="18" y2="18" />
      <line x1="6" y1="12" x2="18" y2="12" />
      <circle cx="6" cy="6" r="2" fill="currentColor" />
    </svg>
  )
}

/**
 * Иконка автоматической коробки передач
 */
function AutomaticIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 4L5 20M12 4L19 20M8 14H16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export interface VehicleFormData {
  id?: string
  brand: string
  model: string
  year: string
  color: string
  plateNumber: string
  transmission: 'MANUAL' | 'AUTOMATIC'
}

interface VehicleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vehicle?: VehicleData | null
  onSubmit: (data: VehicleFormData) => Promise<void>
  onPhotos?: (vehicle: VehicleData) => void
  isPending?: boolean
}

export function VehicleFormDialog({
  open,
  onOpenChange,
  vehicle,
  onSubmit,
  onPhotos,
  isPending,
}: VehicleFormDialogProps) {
  const isEdit = !!vehicle

  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [color, setColor] = useState('')
  const [plateNumber, setPlateNumber] = useState('')
  const [transmission, setTransmission] = useState<'MANUAL' | 'AUTOMATIC'>('MANUAL')

  // Синхронизация формы при изменении vehicle или открытии диалога
  useEffect(() => {
    if (open) {
      // При открытии диалога - загружаем данные из vehicle или очищаем форму
      setBrand(vehicle?.brand ?? '')
      setModel(vehicle?.model ?? '')
      setYear(vehicle?.year?.toString() ?? '')
      setColor(vehicle?.color ?? '')
      setPlateNumber(vehicle?.plateNumber ?? '')
      setTransmission(vehicle?.transmission ?? 'MANUAL')
    }
  }, [open, vehicle])

  const handleOpenChange = (details: { open: boolean }) => {
    onOpenChange(details.open)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({
      id: vehicle?.id,
      brand,
      model,
      year,
      color,
      plateNumber,
      transmission,
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange} placement="center">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="lg">
            <Dialog.Header>
              <Dialog.Title>
                <HStack gap={2}>
                  <LuCar />
                  {isEdit ? 'Редактировать автомобиль' : 'Добавить автомобиль'}
                </HStack>
              </Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>

            <Dialog.Body>
              <form id="vehicle-form" onSubmit={handleSubmit}>
                <VStack gap={4} align="stretch">
                  {/* Фото автомобиля */}
                  {isEdit && vehicle ? (
                    <Box
                      p={3}
                      bg="bg.muted"
                      borderRadius="md"
                      cursor="pointer"
                      onClick={() => onPhotos?.(vehicle)}
                      _hover={{ bg: 'bg.emphasized' }}
                      transition="background 0.2s"
                    >
                      <HStack justify="space-between">
                        <HStack gap={2}>
                          <LuCamera />
                          <Text fontSize="sm">
                            {vehicle.files.length > 0
                              ? `Фото: ${vehicle.files.length} шт.`
                              : 'Добавить фото автомобиля'}
                          </Text>
                        </HStack>
                        <Text fontSize="xs" color="fg.muted">
                          Нажмите для редактирования →
                        </Text>
                      </HStack>
                    </Box>
                  ) : (
                    <Box p={3} bg="bg.muted" borderRadius="md">
                      <HStack gap={2}>
                        <LuCamera />
                        <Text fontSize="sm" color="fg.muted">
                          Фото можно добавить после сохранения
                        </Text>
                      </HStack>
                    </Box>
                  )}

                  <Grid templateColumns={{ base: '1fr', sm: '1fr 1fr' }} gap={4}>
                    <Field.Root required>
                      <Field.Label>Марка</Field.Label>
                      <Input
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        placeholder="Kia"
                        disabled={isPending}
                      />
                    </Field.Root>

                    <Field.Root required>
                      <Field.Label>Модель</Field.Label>
                      <Input
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder="Rio"
                        disabled={isPending}
                      />
                    </Field.Root>
                  </Grid>

                  <Grid templateColumns={{ base: '1fr', sm: '1fr 1fr' }} gap={4}>
                    <Field.Root>
                      <Field.Label>Год выпуска</Field.Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        placeholder="2020"
                        min={1900}
                        max={new Date().getFullYear() + 1}
                        disabled={isPending}
                      />
                    </Field.Root>

                    <Field.Root>
                      <Field.Label>Цвет</Field.Label>
                      <Input
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        placeholder="Белый"
                        disabled={isPending}
                      />
                    </Field.Root>
                  </Grid>

                  <Grid templateColumns={{ base: '1fr', sm: '1fr 1fr' }} gap={4}>
                    <Field.Root>
                      <Field.Label>Госномер</Field.Label>
                      <InputPlateNumber value={plateNumber} onChange={setPlateNumber} disabled={isPending} />
                    </Field.Root>

                    <Field.Root>
                      <Field.Label>Коробка передач</Field.Label>
                      <HStack gap={2}>
                        <Button
                          type="button"
                          variant={transmission === 'MANUAL' ? 'solid' : 'outline'}
                          colorPalette={transmission === 'MANUAL' ? 'fg' : 'gray'}
                          onClick={() => setTransmission('MANUAL')}
                          disabled={isPending}
                          flex={1}
                          size="sm"
                        >
                          <ManualIcon size={16} />
                          МТ
                        </Button>
                        <Button
                          type="button"
                          variant={transmission === 'AUTOMATIC' ? 'solid' : 'outline'}
                          colorPalette={transmission === 'AUTOMATIC' ? 'fg' : 'gray'}
                          onClick={() => setTransmission('AUTOMATIC')}
                          disabled={isPending}
                          flex={1}
                          size="sm"
                        >
                          <AutomaticIcon size={16} />
                          АТ
                        </Button>
                      </HStack>
                    </Field.Root>
                  </Grid>
                </VStack>
              </form>
            </Dialog.Body>

            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline" disabled={isPending}>
                  Отмена
                </Button>
              </Dialog.ActionTrigger>
              <Button
                type="submit"
                form="vehicle-form"
                colorPalette="brand"
                loading={isPending}
                disabled={!brand || !model}
              >
                <LuSave />
                {isEdit ? 'Сохранить' : 'Добавить'}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
