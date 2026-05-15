'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Box, Button, HStack, Input, Text, Textarea, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { approveReturn, rejectReturn, updateReturnStatus } from '../../_actions/manage-return'

interface ReturnActionsProps {
  returnId: string
  status: string
  subOrderTotal: number
}

/** Действия администратора по возврату */
export function ReturnActions({ returnId, status, subOrderTotal }: ReturnActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [refundAmount, setRefundAmount] = useState(String(subOrderTotal))
  const [reviewNote, setReviewNote] = useState('')
  const [rejectNote, setRejectNote] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)

  const handleApprove = () => {
    const amount = Number(refundAmount)
    if (!amount || amount <= 0) {
      toaster.error({ title: 'Укажите корректную сумму возврата' })
      return
    }
    startTransition(async () => {
      const result = await approveReturn(returnId, amount, reviewNote || undefined)
      if (result.success) {
        toaster.success({ title: 'Возврат одобрен' })
        router.refresh()
      } else {
        toaster.error({ title: result.error || 'Ошибка' })
      }
    })
  }

  const handleReject = () => {
    if (!rejectNote.trim()) {
      toaster.error({ title: 'Укажите причину отклонения' })
      return
    }
    startTransition(async () => {
      const result = await rejectReturn(returnId, rejectNote)
      if (result.success) {
        toaster.success({ title: 'Возврат отклонён' })
        router.refresh()
      } else {
        toaster.error({ title: result.error || 'Ошибка' })
      }
    })
  }

  const handleStatusUpdate = (newStatus: string, label: string) => {
    startTransition(async () => {
      const result = await updateReturnStatus(returnId, newStatus)
      if (result.success) {
        toaster.success({ title: `Статус обновлён: ${label}` })
        router.refresh()
      } else {
        toaster.error({ title: result.error || 'Ошибка' })
      }
    })
  }

  // Запрошен — можно одобрить или отклонить
  if (status === 'REQUESTED') {
    return (
      <VStack gap={4} align="stretch">
        {/* Форма одобрения */}
        <Box borderWidth="1px" borderRadius="lg" p={5}>
          <Text fontWeight="bold" mb={3}>
            Одобрить возврат
          </Text>
          <VStack align="stretch" gap={3}>
            <Box>
              <Text fontSize="sm" mb={1}>
                Сумма возврата (₽)
              </Text>
              <Input
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                max={subOrderTotal}
              />
              <Text fontSize="xs" color="fg.muted" mt={1}>
                Максимум: {subOrderTotal.toLocaleString('ru-RU')} ₽
              </Text>
            </Box>
            <Box>
              <Text fontSize="sm" mb={1}>
                Комментарий (необязательно)
              </Text>
              <Textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Комментарий для покупателя..."
                rows={2}
              />
            </Box>
            <Button colorPalette="green" onClick={handleApprove} loading={isPending}>
              Одобрить возврат
            </Button>
          </VStack>
        </Box>

        {/* Форма отклонения */}
        <Box borderWidth="1px" borderRadius="lg" p={5}>
          {!showRejectForm ? (
            <Button variant="outline" colorPalette="red" onClick={() => setShowRejectForm(true)}>
              Отклонить возврат
            </Button>
          ) : (
            <VStack align="stretch" gap={3}>
              <Text fontWeight="bold">Отклонить возврат</Text>
              <Textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Причина отклонения (обязательно)..."
                rows={3}
              />
              <HStack>
                <Button colorPalette="red" onClick={handleReject} loading={isPending}>
                  Отклонить
                </Button>
                <Button variant="ghost" onClick={() => setShowRejectForm(false)}>
                  Отмена
                </Button>
              </HStack>
            </VStack>
          )}
        </Box>
      </VStack>
    )
  }

  // Промежуточные статусы
  if (status === 'APPROVED') {
    return (
      <Button
        colorPalette="purple"
        onClick={() => handleStatusUpdate('SHIPPED_BACK', 'Отправлен назад')}
        loading={isPending}
      >
        Отметить: товар отправлен назад
      </Button>
    )
  }

  if (status === 'SHIPPED_BACK') {
    return (
      <Button colorPalette="cyan" onClick={() => handleStatusUpdate('RECEIVED', 'Получен')} loading={isPending}>
        Отметить: товар получен
      </Button>
    )
  }

  if (status === 'RECEIVED') {
    return (
      <Button colorPalette="green" onClick={() => handleStatusUpdate('REFUNDED', 'Возвращён')} loading={isPending}>
        Подтвердить возврат средств
      </Button>
    )
  }

  // REJECTED / REFUNDED — действий нет
  return null
}
