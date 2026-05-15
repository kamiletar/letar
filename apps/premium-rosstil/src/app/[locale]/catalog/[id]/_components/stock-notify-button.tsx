'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Button, Icon } from '@chakra-ui/react'
import { useState, useTransition } from 'react'
import { FiBell, FiBellOff } from 'react-icons/fi'
import { subscribeToStockNotification, unsubscribeFromStockNotification } from '../_actions/stock-notification'

interface StockNotifyButtonProps {
  productItemId: string
  /** Уже подписан */
  isSubscribed: boolean
}

/** Кнопка "Сообщить о поступлении" для товара без остатка */
export function StockNotifyButton({ productItemId, isSubscribed: initial }: StockNotifyButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [isSubscribed, setIsSubscribed] = useState(initial)

  const handleClick = () => {
    startTransition(async () => {
      const result = isSubscribed
        ? await unsubscribeFromStockNotification(productItemId)
        : await subscribeToStockNotification(productItemId)

      if (result.success) {
        setIsSubscribed(!isSubscribed)
        toaster.success({
          title: isSubscribed ? 'Подписка отменена' : 'Вы получите уведомление',
          description: isSubscribed ? undefined : 'Мы отправим email, когда товар появится в наличии',
        })
      } else {
        toaster.error({ title: result.error || 'Ошибка' })
      }
    })
  }

  return (
    <Button
      variant={isSubscribed ? 'outline' : 'solid'}
      colorPalette={isSubscribed ? 'gray' : 'fg'}
      size="sm"
      onClick={handleClick}
      loading={isPending}
    >
      <Icon as={isSubscribed ? FiBellOff : FiBell} mr={1} />
      {isSubscribed ? 'Отменить уведомление' : 'Сообщить о поступлении'}
    </Button>
  )
}
