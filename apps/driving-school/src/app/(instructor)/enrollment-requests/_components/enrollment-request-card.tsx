'use client'

import { Avatar, Badge, Box, Button, Card, HStack, Stack, Text, Textarea } from '@chakra-ui/react'
import { formatPhone } from '@letar/format-utils'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useState, useTransition } from 'react'
import { LuCar, LuCheck, LuMessageSquare, LuPhone, LuX } from 'react-icons/lu'
import { approveEnrollmentRequestAction, rejectEnrollmentRequestAction } from '../_actions/process-request.action'

interface EnrollmentRequestCardProps {
  request: {
    id: string
    type: string
    status: string
    message: string | null
    createdAt: Date
    student: {
      id: string
      name: string | null
      image: string | null
      phone: string | null
    }
    vehicle: {
      id: string
      brand: string
      model: string
      transmission: string
    } | null
  }
}

export function EnrollmentRequestCard({ request }: EnrollmentRequestCardProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showRejectReason, setShowRejectReason] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const isPendingRequest = request.status === 'PENDING'

  const handleApprove = () => {
    startTransition(async () => {
      setError(null)
      const result = await approveEnrollmentRequestAction(request.id)
      if (!result.success) {
        setError(result.error || 'Ошибка при одобрении заявки')
      }
    })
  }

  const handleReject = () => {
    if (!showRejectReason) {
      setShowRejectReason(true)
      return
    }

    startTransition(async () => {
      setError(null)
      const result = await rejectEnrollmentRequestAction(request.id, rejectReason)
      if (!result.success) {
        setError(result.error || 'Ошибка при отклонении заявки')
      }
    })
  }

  const statusBadge = {
    PENDING: { colorPalette: 'yellow', label: 'Ожидает' },
    APPROVED: { colorPalette: 'green', label: 'Одобрена' },
    REJECTED: { colorPalette: 'red', label: 'Отклонена' },
    CANCELLED: { colorPalette: 'gray', label: 'Отменена' },
  }[request.status] || { colorPalette: 'gray', label: request.status }

  return (
    <Card.Root>
      <Card.Body>
        <Stack gap={4}>
          {/* Шапка: аватар и информация о студенте */}
          <HStack gap={4}>
            <Avatar.Root size="lg">
              <Avatar.Image src={request.student.image ?? undefined} alt={request.student.name || 'Ученик'} />
              <Avatar.Fallback>{request.student.name?.charAt(0) || '?'}</Avatar.Fallback>
            </Avatar.Root>

            <Box flex={1}>
              <HStack justify="space-between" align="flex-start">
                <Box>
                  <Text fontWeight="semibold" fontSize="lg">
                    {request.student.name || 'Без имени'}
                  </Text>
                  {request.student.phone && (
                    <HStack gap={1} color="fg.muted" fontSize="sm">
                      <LuPhone size={14} />
                      <Text>{formatPhone(request.student.phone)}</Text>
                    </HStack>
                  )}
                </Box>
                <Badge colorPalette={statusBadge.colorPalette}>{statusBadge.label}</Badge>
              </HStack>
            </Box>
          </HStack>

          {/* Выбранный автомобиль */}
          {request.vehicle && (
            <HStack gap={2} color="fg.muted" fontSize="sm">
              <LuCar size={16} />
              <Text>
                {request.vehicle.brand} {request.vehicle.model} (
                {request.vehicle.transmission === 'MANUAL' ? 'механика' : 'автомат'})
              </Text>
            </HStack>
          )}

          {/* Сообщение от ученика */}
          {request.message && (
            <Box bg="bg.subtle" p={3} borderRadius="md">
              <HStack gap={2} mb={1} color="fg.muted" fontSize="sm">
                <LuMessageSquare size={14} />
                <Text fontWeight="medium">Сообщение:</Text>
              </HStack>
              <Text fontSize="sm">{request.message}</Text>
            </Box>
          )}

          {/* Дата заявки */}
          <Text fontSize="sm" color="fg.muted">
            {formatDistanceToNow(new Date(request.createdAt), { locale: ru, addSuffix: true })}
          </Text>

          {/* Ошибка */}
          {error && (
            <Text fontSize="sm" color="red.500">
              {error}
            </Text>
          )}

          {/* Поле для причины отклонения */}
          {showRejectReason && isPendingRequest && (
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Причина отклонения (необязательно):
              </Text>
              <Textarea
                placeholder="Укажите причину отклонения..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={2}
                size="sm"
              />
            </Box>
          )}

          {/* Кнопки действий */}
          {isPendingRequest && (
            <HStack gap={2}>
              <Button colorPalette="green" onClick={handleApprove} loading={isPending} disabled={isPending} flex={1}>
                <LuCheck size={16} />
                Принять
              </Button>
              <Button
                colorPalette="red"
                variant={showRejectReason ? 'solid' : 'outline'}
                onClick={handleReject}
                loading={isPending}
                disabled={isPending}
                flex={1}
              >
                <LuX size={16} />
                {showRejectReason ? 'Подтвердить отказ' : 'Отклонить'}
              </Button>
              {showRejectReason && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowRejectReason(false)
                    setRejectReason('')
                  }}
                  disabled={isPending}
                >
                  Отмена
                </Button>
              )}
            </HStack>
          )}
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}
