'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { useRouter } from '@/i18n/navigation'
import { Box, HStack, IconButton, Link, Text, VStack } from '@chakra-ui/react'
import { NumberInput } from '@chakra-ui/react/number-input'
import NextImage from 'next/image'
import NextLink from 'next/link'
import { useOptimistic, useTransition } from 'react'
import { FiTrash2 } from 'react-icons/fi'
import { removeFromCart } from '../_actions/remove-from-cart'
import { updateCartItem } from '../_actions/update-cart-item'

interface CartItemCardProps {
  item: {
    id: string
    quantity: number
    productItem: {
      id: string
      price: number
      size: {
        id: string
        international: string
        ru: string
      }
      variant: {
        id: string
        color: string
        composition: string
        product: {
          id: string
          name: string
          gender: string
        }
        images: Array<{
          id: string
          url: string
          alt: string | null
        }>
      }
    }
  }
}

/**
 * Карточка товара в корзине с управлением количеством и удалением.
 */
export function CartItemCard({ item }: CartItemCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Оптимистичное обновление количества — UI меняется мгновенно
  const [optimisticQuantity, setOptimisticQuantity] = useOptimistic(
    item.quantity,
    (_, newQuantity: number) => newQuantity
  )

  // Оптимистичное удаление — товар исчезает мгновенно
  const [optimisticDeleted, setOptimisticDeleted] = useOptimistic(false, () => true)

  const { productItem } = item
  const { variant } = productItem
  const { product } = variant

  const firstImage = variant.images[0]
  const totalPrice = Number(productItem.price) * optimisticQuantity

  const handleUpdateQuantity = (newQuantity: number) => {
    if (newQuantity === optimisticQuantity) {
      return
    }

    startTransition(async () => {
      // Мгновенно обновляем UI
      setOptimisticQuantity(newQuantity)

      const result = await updateCartItem(item.id, newQuantity)

      if (result.success) {
        router.refresh()
      } else {
        // При ошибке React автоматически откатит к item.quantity
        toaster.error({
          title: 'Ошибка',
          description: result.error,
        })
      }
    })
  }

  const handleRemove = () => {
    startTransition(async () => {
      // Мгновенно скрываем товар
      setOptimisticDeleted(true)

      const result = await removeFromCart(item.id)

      if (result.success) {
        router.refresh()
        toaster.success({
          title: 'Товар удален из корзины',
        })
      } else {
        // При ошибке React автоматически откатит (товар появится снова)
        toaster.error({
          title: 'Ошибка',
          description: result.error,
        })
      }
    })
  }

  // Если товар оптимистично удалён — не рендерим
  if (optimisticDeleted) {
    return null
  }

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      p={4}
      display="grid"
      gridTemplateColumns={{ base: '100px 1fr', md: '150px 1fr' }}
      gap={4}
      opacity={isPending ? 0.5 : 1}
      transition="opacity 0.2s"
    >
      {/* Изображение */}
      <Box>
        {firstImage ? (
          <Link asChild>
            <NextLink href={`/catalog/${product.id}`}>
              <Box asChild borderRadius="md" overflow="hidden">
                <NextImage
                  src={firstImage.url}
                  alt={firstImage.alt || product.name}
                  width={150}
                  height={200}
                  style={{ objectFit: 'cover' }}
                />
              </Box>
            </NextLink>
          </Link>
        ) : (
          <Box
            bg="gray.100"
            width="100%"
            height="200px"
            borderRadius="md"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Text color="fg.muted" fontSize="sm">
              Нет фото
            </Text>
          </Box>
        )}
      </Box>

      {/* Информация о товаре */}
      <VStack align="stretch" gap={3}>
        {/* Название и цена */}
        <Box>
          <Link asChild fontWeight="semibold" fontSize="lg">
            <NextLink href={`/catalog/${product.id}`}>{product.name}</NextLink>
          </Link>
          <Text color="fg.muted" fontSize="sm">
            Цвет: {variant.color}
          </Text>
          <Text color="fg.muted" fontSize="sm">
            Размер: {productItem.size.international} (RU {productItem.size.ru})
          </Text>
        </Box>

        {/* Управление количеством и удаление */}
        <HStack justify="space-between" align="center">
          <HStack gap={4}>
            {/* Количество */}
            <Box>
              <Text fontSize="sm" color="fg.muted" mb={1}>
                Количество
              </Text>
              <NumberInput.Root
                value={optimisticQuantity.toString()}
                onValueChange={(details) => {
                  const newValue = parseInt(details.value)
                  if (!isNaN(newValue) && newValue >= 1) {
                    handleUpdateQuantity(newValue)
                  }
                }}
                min={1}
                max={99}
                width="120px"
                disabled={isPending}
              >
                <NumberInput.Input />
                <NumberInput.Control>
                  <NumberInput.IncrementTrigger />
                  <NumberInput.DecrementTrigger />
                </NumberInput.Control>
              </NumberInput.Root>
            </Box>

            {/* Цена */}
            <Box>
              <Text fontSize="sm" color="fg.muted" mb={1}>
                Цена
              </Text>
              <Text fontSize="lg" fontWeight="bold">
                {totalPrice.toLocaleString('ru-RU', {
                  style: 'currency',
                  currency: 'RUB',
                })}
              </Text>
            </Box>
          </HStack>

          {/* Кнопка удаления */}
          <IconButton
            aria-label="Удалить из корзины"
            variant="ghost"
            colorPalette="red"
            onClick={handleRemove}
            disabled={isPending}
          >
            <FiTrash2 />
          </IconButton>
        </HStack>
      </VStack>
    </Box>
  )
}
