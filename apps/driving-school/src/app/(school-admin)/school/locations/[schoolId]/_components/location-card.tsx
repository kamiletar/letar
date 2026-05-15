'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { formatWorkingHoursCompact, isOpenNow, parseWorkingHours } from '@/lib/working-hours'
import { Badge, Box, Button, Dialog as ChakraDialog, HStack, IconButton, Portal, Stack, Text } from '@chakra-ui/react'
import type { LocationType } from '@letar/driving-school-db/prisma'
import { formatPhone } from '@letar/format-utils'
import { useState, useTransition } from 'react'
import {
  LuBuilding2,
  LuCar,
  LuClock,
  LuGraduationCap,
  LuImage,
  LuMapPin,
  LuPencil,
  LuPhone,
  LuTrash2,
} from 'react-icons/lu'
import type { LocationWithDetails } from '../_actions/location.action'
import { deleteLocationAction } from '../_actions/location.action'
import { LocationForm } from './location-form'
import { LocationImages } from './location-images'

// Лейблы и цвета для типов
const LOCATION_TYPE_CONFIG: Record<LocationType, { label: string; color: string }> = {
  OFFICE: { label: 'Офис', color: 'blue' },
  CLASSROOM: { label: 'Учебный класс', color: 'purple' },
  TRAINING: { label: 'Площадка', color: 'green' },
  // Сервисные типы для системы прогресса ученика
  DOCUMENTS_ONLY: { label: 'Только документы', color: 'orange' },
  PRACTICE_ONLY: { label: 'Только практика', color: 'teal' },
  FULL_SERVICE: { label: 'Полный сервис', color: 'brand' },
}

// Иконки для типов
function LocationTypeIcon({ type, color }: { type: LocationType; color: string }) {
  const iconProps = { size: 20, color: `var(--chakra-colors-${color}-solid)` }
  switch (type) {
    case 'OFFICE':
    case 'DOCUMENTS_ONLY':
      return <LuBuilding2 {...iconProps} />
    case 'CLASSROOM':
      return <LuGraduationCap {...iconProps} />
    case 'TRAINING':
    case 'PRACTICE_ONLY':
    case 'FULL_SERVICE':
      return <LuCar {...iconProps} />
  }
}

type Props = {
  location: LocationWithDetails
  organizationId: string
}

export function LocationCard({ location, organizationId }: Props) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isImagesOpen, setIsImagesOpen] = useState(false)

  // Получаем данные из locationData (могут отсутствовать)
  const locData = location.locationData
  const locationType = locData?.type ?? 'OFFICE'
  const typeConfig = LOCATION_TYPE_CONFIG[locationType]
  const isActive = locData?.isActive ?? true
  const filesCount = location.files?.length ?? 0
  // Парсим рабочие часы из JSON (тип unknown из Prisma Json)
  const parsedWorkingHours = parseWorkingHours(locData?.workingHours)

  return (
    <>
      <Box
        p={4}
        bg={isActive ? 'bg.panel' : 'bg.muted'}
        borderRadius="lg"
        borderWidth="1px"
        borderColor={isActive ? 'border.muted' : 'border.subtle'}
        opacity={isActive ? 1 : 0.7}
      >
        <Stack gap={3}>
          {/* Заголовок */}
          <HStack justify="space-between" align="flex-start">
            <HStack gap={2}>
              <LocationTypeIcon type={locationType} color={typeConfig.color} />
              <Box>
                <Text fontWeight="semibold">{location.name}</Text>
                <Badge size="sm" colorPalette={typeConfig.color} variant="subtle">
                  {typeConfig.label}
                </Badge>
              </Box>
            </HStack>

            <HStack gap={1}>
              <IconButton
                aria-label={`Фото (${filesCount})`}
                size="sm"
                variant="ghost"
                onClick={() => setIsImagesOpen(true)}
              >
                <LuImage />
                {filesCount > 0 && (
                  <Badge size="xs" colorPalette="green" variant="solid" ml={-1} mt={-2}>
                    {filesCount}
                  </Badge>
                )}
              </IconButton>
              <IconButton aria-label="Редактировать" size="sm" variant="ghost" onClick={() => setIsEditOpen(true)}>
                <LuPencil />
              </IconButton>
              <IconButton
                aria-label="Удалить"
                size="sm"
                variant="ghost"
                colorPalette="red"
                onClick={() => setIsDeleteOpen(true)}
              >
                <LuTrash2 />
              </IconButton>
            </HStack>
          </HStack>

          {/* Информация */}
          <Stack gap={1.5} fontSize="sm" color="fg.muted">
            {locData?.city && locData?.address && (
              <HStack gap={2}>
                <LuMapPin size={16} />
                <Text>
                  {locData?.city}, {locData?.address}
                </Text>
              </HStack>
            )}

            {locData?.phone && (
              <HStack gap={2}>
                <LuPhone size={16} />
                <Text>{formatPhone(locData?.phone)}</Text>
              </HStack>
            )}

            {parsedWorkingHours && (
              <HStack gap={2}>
                <LuClock size={16} />
                <Text>{formatWorkingHoursCompact(parsedWorkingHours).join(', ')}</Text>
              </HStack>
            )}

            {/* Статус открыто/закрыто */}
            {parsedWorkingHours && (
              <Badge colorPalette={isOpenNow(parsedWorkingHours, locData?.timezone) ? 'green' : 'red'} size="sm">
                {isOpenNow(parsedWorkingHours, locData?.timezone) ? 'Открыто' : 'Закрыто'}
              </Badge>
            )}
          </Stack>

          {locData?.description && (
            <Text fontSize="sm" color="fg.muted">
              {locData?.description}
            </Text>
          )}

          {!isActive && (
            <Badge colorPalette="gray" size="sm">
              Неактивен
            </Badge>
          )}
        </Stack>
      </Box>

      {/* Диалог редактирования */}
      <ChakraDialog.Root
        open={isEditOpen}
        onOpenChange={(e) => setIsEditOpen(e.open)}
        size={{ base: 'full', md: 'lg' }}
      >
        <Portal>
          <ChakraDialog.Backdrop />
          <ChakraDialog.Positioner>
            <ChakraDialog.Content>
              <ChakraDialog.Header>
                <ChakraDialog.Title>Редактирование филиала</ChakraDialog.Title>
              </ChakraDialog.Header>
              <ChakraDialog.Body>
                <LocationForm
                  organizationId={organizationId}
                  location={location}
                  onSuccess={() => setIsEditOpen(false)}
                />
              </ChakraDialog.Body>
              <ChakraDialog.CloseTrigger />
            </ChakraDialog.Content>
          </ChakraDialog.Positioner>
        </Portal>
      </ChakraDialog.Root>

      {/* Диалог удаления */}
      <DeleteLocationDialog
        location={location}
        organizationId={organizationId}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
      />

      {/* Диалог фотографий */}
      <ChakraDialog.Root
        open={isImagesOpen}
        onOpenChange={(e) => setIsImagesOpen(e.open)}
        size={{ base: 'full', md: 'xl' }}
      >
        <Portal>
          <ChakraDialog.Backdrop />
          <ChakraDialog.Positioner>
            <ChakraDialog.Content>
              <ChakraDialog.Header>
                <ChakraDialog.Title>Фотографии — {location.name}</ChakraDialog.Title>
              </ChakraDialog.Header>
              <ChakraDialog.Body>
                <LocationImages locationId={location.id} files={location.files ?? []} />
              </ChakraDialog.Body>
              <ChakraDialog.CloseTrigger />
            </ChakraDialog.Content>
          </ChakraDialog.Positioner>
        </Portal>
      </ChakraDialog.Root>
    </>
  )
}

// Компонент диалога удаления
function DeleteLocationDialog({
  location,
  organizationId,
  open,
  onOpenChange,
}: {
  location: LocationWithDetails
  organizationId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleDelete = () => {
    setError(null)
    startTransition(async () => {
      const result = await deleteLocationAction({ locationId: location.id, organizationId })

      if (result.success) {
        toaster.success({
          title: 'Филиал удалён',
          description: `Филиал "${location.name}" был удалён`,
        })
        onOpenChange(false)
      } else {
        setError(result.error?.formErrors?.join(', ') ?? 'Произошла ошибка')
      }
    })
  }

  return (
    <ChakraDialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)} size={{ base: 'full', md: 'sm' }}>
      <Portal>
        <ChakraDialog.Backdrop />
        <ChakraDialog.Positioner>
          <ChakraDialog.Content>
            <ChakraDialog.Header>
              <ChakraDialog.Title>Удалить филиал?</ChakraDialog.Title>
            </ChakraDialog.Header>
            <ChakraDialog.Body>
              <Text>
                Вы уверены, что хотите удалить филиал <strong>{location.name}</strong>?
              </Text>
              <Text color="fg.muted" mt={2}>
                Это действие нельзя отменить.
              </Text>
              {error && (
                <Text color="fg.error" mt={2}>
                  {error}
                </Text>
              )}
            </ChakraDialog.Body>
            <ChakraDialog.Footer>
              <HStack gap={3}>
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                  Отмена
                </Button>
                <Button colorPalette="red" loading={isPending} loadingText="Удаление..." onClick={handleDelete}>
                  <LuTrash2 />
                  Удалить
                </Button>
              </HStack>
            </ChakraDialog.Footer>
            <ChakraDialog.CloseTrigger />
          </ChakraDialog.Content>
        </ChakraDialog.Positioner>
      </Portal>
    </ChakraDialog.Root>
  )
}
