'use client'

import { Avatar, Badge, Box, Button, Card, HStack, Stack, Text } from '@chakra-ui/react'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useState, useTransition } from 'react'
import { LuBuilding2, LuCar, LuMessageSquare, LuUser, LuX } from 'react-icons/lu'
import { cancelEnrollmentRequestAction } from '../_actions/my-requests.action'

interface MyRequestCardProps {
  request: {
    id: string
    type: string
    status: string
    message: string | null
    rejectReason: string | null
    createdAt: Date
    processedAt: Date | null
    instructor: {
      id: string
      name: string | null
      image: string | null
      bio: string | null
    } | null
    organization: {
      id: string
      name: string
    } | null
    vehicle: {
      id: string
      brand: string
      model: string
    } | null
  }
}

export function MyRequestCard({ request }: MyRequestCardProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isPendingRequest = request.status === 'PENDING'

  const handleCancel = () => {
    startTransition(async () => {
      setError(null)
      const result = await cancelEnrollmentRequestAction(request.id)
      if (!result.success) {
        setError(result.error || 'Ошибка при отмене заявки')
      }
    })
  }

  const statusBadge = {
    PENDING: { colorPalette: 'yellow', label: 'Ожидает ответа' },
    APPROVED: { colorPalette: 'green', label: 'Одобрена' },
    REJECTED: { colorPalette: 'red', label: 'Отклонена' },
    CANCELLED: { colorPalette: 'gray', label: 'Отменена' },
  }[request.status] || { colorPalette: 'gray', label: request.status }

  const typeBadge =
    request.type === 'DIRECT' ? { icon: LuUser, label: 'Напрямую' } : { icon: LuBuilding2, label: 'Через школу' }

  return (
    <Card.Root>
      <Card.Body>
        <Stack gap={4}>
          {/* Шапка: информация об инструкторе */}
          <HStack gap={4}>
            <Avatar.Root size="lg">
              <Avatar.Image
                src={request.instructor?.image ?? undefined}
                alt={request.instructor?.name || 'Инструктор'}
              />
              <Avatar.Fallback>{request.instructor?.name?.charAt(0) || '?'}</Avatar.Fallback>
            </Avatar.Root>

            <Box flex={1}>
              <HStack justify="space-between" align="flex-start">
                <Box>
                  <Text fontWeight="semibold" fontSize="lg">
                    {request.instructor?.name || 'Инструктор'}
                  </Text>
                  {request.instructor?.bio && (
                    <Text fontSize="sm" color="fg.muted" lineClamp={1}>
                      {request.instructor.bio}
                    </Text>
                  )}
                </Box>
                <Badge colorPalette={statusBadge.colorPalette}>{statusBadge.label}</Badge>
              </HStack>
            </Box>
          </HStack>

          {/* Тип заявки */}
          <HStack gap={2}>
            <Badge variant="outline">
              <typeBadge.icon size={14} />
              {typeBadge.label}
            </Badge>
            {request.organization && (
              <Badge variant="subtle" colorPalette="blue">
                {request.organization.name}
              </Badge>
            )}
          </HStack>

          {/* Выбранный автомобиль */}
          {request.vehicle && (
            <HStack gap={2} color="fg.muted" fontSize="sm">
              <LuCar size={16} />
              <Text>
                {request.vehicle.brand} {request.vehicle.model}
              </Text>
            </HStack>
          )}

          {/* Сообщение */}
          {request.message && (
            <Box bg="bg.subtle" p={3} borderRadius="md">
              <HStack gap={2} mb={1} color="fg.muted" fontSize="sm">
                <LuMessageSquare size={14} />
                <Text fontWeight="medium">Ваше сообщение:</Text>
              </HStack>
              <Text fontSize="sm">{request.message}</Text>
            </Box>
          )}

          {/* Причина отклонения */}
          {request.status === 'REJECTED' && request.rejectReason && (
            <Box bg="red.subtle" p={3} borderRadius="md">
              <Text fontSize="sm" fontWeight="medium" color="red.fg" mb={1}>
                Причина отклонения:
              </Text>
              <Text fontSize="sm" color="red.fg">
                {request.rejectReason}
              </Text>
            </Box>
          )}

          {/* Даты */}
          <HStack gap={4} fontSize="sm" color="fg.muted">
            <Text>Отправлена: {formatDistanceToNow(new Date(request.createdAt), { locale: ru, addSuffix: true })}</Text>
            {request.processedAt && (
              <Text>
                Обработана: {formatDistanceToNow(new Date(request.processedAt), { locale: ru, addSuffix: true })}
              </Text>
            )}
          </HStack>

          {/* Ошибка */}
          {error && (
            <Text fontSize="sm" color="red.500">
              {error}
            </Text>
          )}

          {/* Кнопка отмены */}
          {isPendingRequest && (
            <Button
              colorPalette="red"
              variant="outline"
              onClick={handleCancel}
              loading={isPending}
              disabled={isPending}
            >
              <LuX size={16} />
              Отменить заявку
            </Button>
          )}
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}
