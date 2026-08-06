'use client'

import { toaster } from '@/app/_components/ui/toaster'
import type { Product } from '@/lib/db'
import { Button } from '@chakra-ui/react'

interface OrderButtonProps {
  product: Product
}

export function OrderButton({ product }: OrderButtonProps) {
  const handleOrder = () => {
    // Формируем текст для заказа
    const orderText =
      `Здравствуйте! Хочу заказать: ${product.name}\nЦена: ${product.price} ₽\n\nСсылка: ${window.location.href}`

    // Копируем в буфер обмена
    navigator.clipboard
      .writeText(orderText)
      .then(() => {
        toaster.create({
          title: 'Скопировано!',
          description: 'Текст заказа скопирован в буфер обмена. Теперь вы можете отправить его продавцу.',
          type: 'success',
          duration: 5000,
        })
      })
      .catch(() => {
        toaster.create({
          title: 'Ошибка',
          description: 'Не удалось скопировать текст',
          type: 'error',
          duration: 3000,
        })
      })

    // Опционально: открыть VK или Telegram (можно добавить позже)
    // window.open(`https://vk.com/im?sel=...&ref=order_${product.slug}`, '_blank')
  }

  return (
    <Button size="xl" colorPalette="fg" onClick={handleOrder} width={{ base: 'full', md: 'auto' }}>
      Заказать
    </Button>
  )
}
