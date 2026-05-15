'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Button, HStack, Input } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { markSubOrderShipped } from '../_actions/update-sub-order'

interface ShippingFormProps {
  subOrderId: string
}

/**
 * Форма ввода трекинг-номера и отметки заказа как отправленного.
 */
export function ShippingForm({ subOrderId }: ShippingFormProps) {
  const [trackingNumber, setTrackingNumber] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleSubmit = () => {
    if (!trackingNumber.trim()) {
      toaster.error({ title: 'Введите трек-номер' })
      return
    }

    startTransition(async () => {
      const result = await markSubOrderShipped(subOrderId, { trackingNumber: trackingNumber.trim() })
      if (result.success) {
        toaster.success({ title: 'Заказ отмечен как отправленный' })
        router.refresh()
      } else {
        toaster.error({ title: result.error })
      }
    })
  }

  return (
    <HStack gap={3}>
      <Input
        placeholder="Введите трек-номер"
        value={trackingNumber}
        onChange={(e) => setTrackingNumber(e.target.value)}
        flex={1}
      />
      <Button colorPalette="fg" onClick={handleSubmit} loading={isPending}>
        Отправлен
      </Button>
    </HStack>
  )
}
