'use client'

import { Box, Button, HStack, Input, Stack, Text, Textarea } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  setInternalNotesAction,
  setOrderStatusAction,
  setTrackingNumberAction,
} from '../../../_actions/orders.action'

const STATUS_LABELS: Record<string, string> = {
  PLACED: 'Принят',
  CONFIRMED: 'Подтвердить',
  PAID: 'Отметить оплачен',
  PRINTING: 'Запустить в печать',
  SHIPPED: 'Отгрузить',
  DELIVERED: 'Доставлено',
  CANCELLED: 'Отменить',
  REFUNDED: 'Возврат',
}

const DESTRUCTIVE = new Set(['CANCELLED', 'REFUNDED'])

export function OrderControls({
  orderId,
  currentStatus,
  allowedNext,
  trackingNumber,
  internalNotes,
}: {
  orderId: string
  currentStatus: string
  allowedNext: string[]
  trackingNumber: string
  internalNotes: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [tracking, setTracking] = useState(trackingNumber)
  const [notes, setNotes] = useState(internalNotes)

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      setError(null)
      const result = await fn()
      if (!result.ok && result.error) setError(result.error)
      router.refresh()
    })
  }

  return (
    <Stack gap={6} p={5} borderWidth="1px" borderColor="border" borderRadius="xl" bg="bg.surface">
      <Text fontSize="sm" fontWeight="semibold" color="fg.muted" textTransform="uppercase" letterSpacing="wider">
        Управление заказом
      </Text>

      {error && (
        <Box bg="red.subtle" color="red.fg" p={3} borderRadius="md" fontSize="sm">
          {error}
        </Box>
      )}

      <Stack gap={2}>
        <Text fontSize="sm" color="fg.muted">Текущий статус: <strong>{STATUS_LABELS[currentStatus] ?? currentStatus}</strong></Text>
        {allowedNext.length === 0
          ? <Text fontSize="sm" color="fg.muted">Финальный статус — переходов нет.</Text>
          : (
            <HStack gap={2} wrap="wrap">
              {allowedNext.map((next) => (
                <Button
                  key={next}
                  size="sm"
                  variant="outline"
                  colorPalette={DESTRUCTIVE.has(next) ? 'red' : 'brand'}
                  loading={isPending}
                  onClick={() => {
                    if (DESTRUCTIVE.has(next) && !confirm(`Точно поменять статус на «${STATUS_LABELS[next]}»?`)) return
                    run(() => setOrderStatusAction(orderId, { status: next }))
                  }}
                >
                  → {STATUS_LABELS[next] ?? next}
                </Button>
              ))}
            </HStack>
          )}
      </Stack>

      <Stack gap={2}>
        <Text fontSize="sm" color="fg.muted">Трек-номер СДЭК</Text>
        <HStack gap={2}>
          <Input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="1234567890" size="sm" />
          <Button
            size="sm"
            loading={isPending}
            onClick={() => {
              if (!tracking.trim()) return
              run(() => setTrackingNumberAction(orderId, { trackingNumber: tracking.trim() }))
            }}
          >
            Сохранить
          </Button>
        </HStack>
      </Stack>

      <Stack gap={2}>
        <Text fontSize="sm" color="fg.muted">Внутренние заметки (не видны клиенту)</Text>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        <Button
          size="sm"
          alignSelf="flex-start"
          loading={isPending}
          onClick={() => run(() => setInternalNotesAction(orderId, { internalNotes: notes }))}
        >
          Сохранить заметки
        </Button>
      </Stack>
    </Stack>
  )
}
