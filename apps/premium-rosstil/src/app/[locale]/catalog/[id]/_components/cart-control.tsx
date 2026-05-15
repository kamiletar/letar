'use client'

import { addToCart } from '@/app/[locale]/cart/_actions/add-to-cart'
import { getCartItem } from '@/app/[locale]/cart/_actions/get-cart-item'
import { removeFromCart } from '@/app/[locale]/cart/_actions/remove-from-cart'
import { updateCartItem } from '@/app/[locale]/cart/_actions/update-cart-item'
import { NavLink } from '@/app/_components/nav-link'
import { toaster } from '@/app/_components/ui/toaster'
import { useRouter } from '@/i18n/navigation'
import { Box, Button, Group, IconButton, Input, VStack } from '@chakra-ui/react'
import { useEffect, useOptimistic, useState, useTransition } from 'react'
import { FaMinus, FaPlus, FaShoppingCart } from 'react-icons/fa'

interface CartControlProps {
  productItemId: string | null
  disabled?: boolean
  isAuthenticated: boolean
  /** Количество доступного товара. Если 0 — кнопка заблокирована */
  availableCount?: number
  /** Товар доступен для предзаказа */
  isPreOrder?: boolean
}

/**
 * Компонент управления корзиной на странице продукта.
 * Показывает компактную кнопку когда товара нет в корзине,
 * и развернутые контролы (-, input, +, удалить) когда товар добавлен.
 */
type CartItemState = { id: string; quantity: number } | null

// Типы действий для оптимистичных обновлений
type OptimisticAction = { type: 'add'; tempId: string } | { type: 'update'; quantity: number } | { type: 'remove' }

export function CartControl({
  productItemId,
  disabled,
  isAuthenticated,
  availableCount = 0,
  isPreOrder = false,
}: CartControlProps) {
  const isOutOfStock = availableCount === 0 && !isPreOrder
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [cartItem, setCartItem] = useState<CartItemState>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Оптимистичное состояние корзины — UI меняется мгновенно
  const [optimisticCartItem, setOptimisticCartItem] = useOptimistic(
    cartItem,
    (current: CartItemState, action: OptimisticAction): CartItemState => {
      switch (action.type) {
        case 'add':
          // Мгновенно показываем товар в корзине с временным id
          return { id: action.tempId, quantity: 1 }
        case 'update':
          // Мгновенно обновляем количество
          return current ? { ...current, quantity: action.quantity } : null
        case 'remove':
          // Мгновенно удаляем товар
          return null
      }
    }
  )

  // Загрузка информации о товаре в корзине
  useEffect(() => {
    // Флаг для предотвращения race condition
    let cancelled = false
    let timeoutId: NodeJS.Timeout | null = null

    if (!productItemId || !isAuthenticated) {
      setCartItem(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    // Таймаут на случай если Server Action зависает
    timeoutId = setTimeout(() => {
      if (!cancelled) {
        cancelled = true // Предотвращаем обработку запоздалого ответа
        console.error('getCartItem timeout - Server Action did not respond in 5 seconds')
        setCartItem(null)
        setIsLoading(false)
      }
    }, 5000)

    getCartItem(productItemId)
      .then((item) => {
        if (!cancelled) {
          if (timeoutId) {
            clearTimeout(timeoutId)
          }
          setCartItem(item)
        }
      })
      .catch((error) => {
        if (!cancelled) {
          if (timeoutId) {
            clearTimeout(timeoutId)
          }
          console.error('Failed to load cart item:', error)
          setCartItem(null)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    // Cleanup: отменяем обработку ответа при размонтировании или изменении deps
    return () => {
      cancelled = true
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [productItemId, isAuthenticated])

  // Добавление товара в корзину (первый раз)
  const handleAddToCart = () => {
    if (!productItemId) {
      return
    }

    // Редирект на страницу входа если не авторизован
    if (!isAuthenticated) {
      const currentUrl = window.location.pathname + window.location.search
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(currentUrl)}`)
      return
    }

    startTransition(async () => {
      // Мгновенно показываем товар в корзине
      setOptimisticCartItem({ type: 'add', tempId: `temp-${Date.now()}` })

      const result = await addToCart(productItemId, 1)

      if (result.success) {
        toaster.success({
          title: 'Товар добавлен в корзину',
        })
        // Обновляем реальное состояние
        const updatedItem = await getCartItem(productItemId)
        setCartItem(updatedItem)
        router.refresh()
      } else {
        // При ошибке React автоматически откатит к cartItem (null)
        toaster.error({
          title: 'Ошибка',
          description: result.error,
        })
      }
    })
  }

  // Изменение количества
  const handleUpdateQuantity = (newQuantity: number) => {
    if (!cartItem) {
      return
    }

    // Если количество 0 или меньше - удаляем товар
    if (newQuantity <= 0) {
      handleRemove()
      return
    }

    startTransition(async () => {
      // Мгновенно обновляем количество
      setOptimisticCartItem({ type: 'update', quantity: newQuantity })

      const result = await updateCartItem(cartItem.id, newQuantity)

      if (result.success) {
        setCartItem({ ...cartItem, quantity: newQuantity })
        router.refresh()
      } else {
        // При ошибке React автоматически откатит
        toaster.error({
          title: 'Ошибка',
          description: result.error,
        })
      }
    })
  }

  // Удаление товара из корзины
  const handleRemove = () => {
    if (!cartItem) {
      return
    }

    startTransition(async () => {
      // Мгновенно убираем товар из UI
      setOptimisticCartItem({ type: 'remove' })

      const result = await removeFromCart(cartItem.id)

      if (result.success) {
        toaster.success({
          title: 'Товар удален из корзины',
        })
        setCartItem(null)
        router.refresh()
      } else {
        // При ошибке React автоматически откатит (товар появится снова)
        toaster.error({
          title: 'Ошибка',
          description: result.error,
        })
      }
    })
  }

  // Компактный вид - просто иконка корзины
  // Используем optimisticCartItem для мгновенного отклика UI
  if (!optimisticCartItem || isLoading) {
    // Определяем текст кнопки
    const buttonText = !productItemId
      ? 'Выберите размер'
      : isOutOfStock
        ? 'Нет в наличии'
        : isPreOrder
          ? 'Предзаказ'
          : 'Добавить в корзину'

    return (
      <Button
        aria-label={buttonText}
        size="md"
        colorPalette={isOutOfStock ? 'red' : 'fg'}
        variant="outline"
        onClick={handleAddToCart}
        disabled={!productItemId || disabled || isPending || isOutOfStock}
        loading={isPending}
      >
        <FaShoppingCart /> {buttonText}
      </Button>
    )
  }

  // Развернутый вид - контролы количества
  // Используем optimisticCartItem для мгновенного отображения
  return (
    <VStack>
      <Group attached>
        <IconButton
          aria-label="Уменьшить количество"
          size="md"
          colorPalette="fg"
          variant="solid"
          onClick={() => handleUpdateQuantity(optimisticCartItem.quantity - 1)}
          disabled={isPending}
        >
          <FaMinus />
        </IconButton>

        <Input
          type="number"
          value={optimisticCartItem.quantity}
          onChange={(e) => {
            const value = parseInt(e.target.value, 10)
            if (!isNaN(value)) {
              handleUpdateQuantity(value)
            }
          }}
          min={1}
          width="80px"
          textAlign="center"
          size="md"
          disabled={isPending}
        />

        <IconButton
          aria-label="Увеличить количество"
          size="md"
          colorPalette="fg"
          variant="solid"
          onClick={() => handleUpdateQuantity(optimisticCartItem.quantity + 1)}
          disabled={isPending || optimisticCartItem.quantity >= availableCount}
        >
          <FaPlus />
        </IconButton>
      </Group>
      <Box>
        <NavLink href={'/cart'}>Перейти в корзину</NavLink>
      </Box>
    </VStack>
  )
}
