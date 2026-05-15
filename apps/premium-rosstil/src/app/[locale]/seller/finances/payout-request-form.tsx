'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Button, HStack, Input, Stack, Text, Textarea } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { createPayoutRequest } from './_actions/create-payout-request'

interface PayoutRequestFormProps {
  availableAmount: number
}

/**
 * Форма запроса выплаты.
 */
export function PayoutRequestForm({ availableAmount }: PayoutRequestFormProps) {
  const [amount, setAmount] = useState('')
  const [receiptNumber, setReceiptNumber] = useState('')
  const [note, setNote] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(val)

  const handleSubmit = () => {
    const numAmount = Number(amount)
    if (!numAmount || numAmount <= 0) {
      toaster.error({ title: 'Введите корректную сумму' })
      return
    }
    if (numAmount > availableAmount) {
      toaster.error({ title: `Максимальная сумма: ${formatCurrency(availableAmount)}` })
      return
    }

    startTransition(async () => {
      const result = await createPayoutRequest({
        requestedAmount: numAmount,
        receiptNumber: receiptNumber || undefined,
        sellerNote: note || undefined,
      })

      if (result.success) {
        toaster.success({ title: 'Запрос на выплату создан' })
        setAmount('')
        setReceiptNumber('')
        setNote('')
        router.refresh()
      } else {
        toaster.error({ title: result.error })
      }
    })
  }

  return (
    <Stack gap={4}>
      <Text fontSize="sm" color="fg.muted">
        Доступно: {formatCurrency(availableAmount)}
      </Text>

      <HStack gap={3} flexWrap="wrap">
        <Input
          placeholder="Сумма (₽)"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          maxW="200px"
        />
        <Input
          placeholder="Номер чека (опционально)"
          value={receiptNumber}
          onChange={(e) => setReceiptNumber(e.target.value)}
          maxW="300px"
        />
      </HStack>

      <Textarea
        placeholder="Комментарий (опционально)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
      />

      <Button colorPalette="fg" onClick={handleSubmit} loading={isPending} alignSelf="flex-start">
        Запросить выплату
      </Button>
    </Stack>
  )
}
