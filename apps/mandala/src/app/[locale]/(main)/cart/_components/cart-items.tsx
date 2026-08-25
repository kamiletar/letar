'use client'

import { type CartItem as CartItemType, useCart } from '@/app/_components/cart'
import { EmptyState } from '@/app/_components/empty-state'
import { Link as LocalizedLink } from '@/i18n/navigation'
import { Box, Button, Card, Flex, IconButton, Link, NumberInput, Stack, Text, VStack } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { memo, useCallback } from 'react'
import { LuMinus, LuPlus, LuShoppingCart, LuTrash2 } from 'react-icons/lu'

interface CartItemCardProps {
  item: CartItemType
  onUpdateQuantity: (productId: string, quantity: number) => void
  onRemove: (productId: string) => void
  priceUnit: string
  ariaDecrease: string
  ariaIncrease: string
  ariaRemove: string
}

/**
 * Карточка товара в корзине.
 * Мемоизирована для предотвращения ререндеров при изменении других товаров.
 */
const CartItemCard = memo(function CartItemCard({
  item,
  onUpdateQuantity,
  onRemove,
  priceUnit,
  ariaDecrease,
  ariaIncrease,
  ariaRemove,
}: CartItemCardProps) {
  const handleDecrease = useCallback(() => {
    onUpdateQuantity(item.productId, item.quantity - 1)
  }, [item.productId, item.quantity, onUpdateQuantity])

  const handleIncrease = useCallback(() => {
    onUpdateQuantity(item.productId, item.quantity + 1)
  }, [item.productId, item.quantity, onUpdateQuantity])

  const handleQuantityChange = useCallback(
    (details: { value: string }) => {
      const qty = parseInt(details.value, 10)
      if (!isNaN(qty) && qty > 0) {
        onUpdateQuantity(item.productId, qty)
      }
    },
    [item.productId, onUpdateQuantity],
  )

  const handleRemove = useCallback(() => {
    onRemove(item.productId)
  }, [item.productId, onRemove])

  return (
    <Card.Root bg={{ _light: 'blackAlpha.50', _dark: 'whiteAlpha.50' }} borderColor="border.subtle">
      <Card.Body>
        <Flex gap={4} align="flex-start">
          {/* Изображение */}
          {item.imageUrl && (
            <Box position="relative" width="80px" height="80px" borderRadius="md" overflow="hidden" flexShrink={0}>
              <Image src={item.imageUrl} alt={item.name} fill style={{ objectFit: 'cover' }} />
            </Box>
          )}

          {/* Информация о товаре */}
          <Box flex={1}>
            <Link asChild minH="2.75rem" alignItems="center">
              <LocalizedLink href={`/shop/${item.productSlug}`}>
                <Text fontWeight="bold" color="fg" _hover={{ color: 'fg.brand' }}>
                  {item.name}
                </Text>
              </LocalizedLink>
            </Link>
            <Text color="fg" fontSize="lg" fontWeight="bold" mt={1}>
              {item.price} {priceUnit}
            </Text>
          </Box>

          {/* Количество */}
          <Flex align="center" gap={2}>
            <IconButton
              size={{ base: 'md', md: 'sm' }}
              variant="ghost"
              aria-label={ariaDecrease}
              onClick={handleDecrease}
            >
              <LuMinus />
            </IconButton>
            <NumberInput.Root
              value={String(item.quantity)}
              min={1}
              max={99}
              width="60px"
              size="sm"
              onValueChange={handleQuantityChange}
            >
              <NumberInput.Input textAlign="center" />
            </NumberInput.Root>
            <IconButton
              size={{ base: 'md', md: 'sm' }}
              variant="ghost"
              aria-label={ariaIncrease}
              onClick={handleIncrease}
            >
              <LuPlus />
            </IconButton>
          </Flex>

          {/* Сумма */}
          <Text fontWeight="bold" color="fg" minW="80px" textAlign="right">
            {item.price * item.quantity} {priceUnit}
          </Text>

          {/* Удалить */}
          <IconButton
            variant="ghost"
            colorPalette="red"
            size={{ base: 'md', md: 'sm' }}
            aria-label={ariaRemove}
            onClick={handleRemove}
          >
            <LuTrash2 />
          </IconButton>
        </Flex>
      </Card.Body>
    </Card.Root>
  )
})

export function CartItems() {
  const t = useTranslations('cart')
  const { items, total, itemCount, updateQuantity, removeItem, clearCart } = useCart()

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<LuShoppingCart size={64} />}
        title={t('emptyState.title')}
        description={t('emptyState.description')}
        actionLabel={t('emptyState.action')}
        actionHref="/shop"
      />
    )
  }

  return (
    <Stack gap={6}>
      {/* Список товаров */}
      <VStack gap={4} align="stretch">
        {items.map((item) => (
          <CartItemCard
            key={item.productId}
            item={item}
            onUpdateQuantity={updateQuantity}
            onRemove={removeItem}
            priceUnit={t('priceUnit')}
            ariaDecrease={t('aria.decrease')}
            ariaIncrease={t('aria.increase')}
            ariaRemove={t('aria.remove')}
          />
        ))}
      </VStack>

      {/* Итого и кнопки */}
      <Card.Root bg={{ _light: 'blackAlpha.100', _dark: 'whiteAlpha.100' }} borderColor="border.subtle">
        <Card.Body>
          <Flex justify="space-between" align="center" mb={4}>
            <Text color="fg.muted">{t('itemCount', { count: itemCount })}</Text>
            <Text fontSize="2xl" fontWeight="bold" color="fg">
              {t('total')}: {total} {t('priceUnit')}
            </Text>
          </Flex>

          <Stack direction={{ base: 'column', sm: 'row' }} gap={4}>
            <Button variant="outline" colorPalette="red" flex={1} onClick={clearCart}>
              {t('clearCart')}
            </Button>
            <Button colorPalette="fg" flex={2} asChild>
              <LocalizedLink href="/checkout">{t('checkout')}</LocalizedLink>
            </Button>
          </Stack>
        </Card.Body>
      </Card.Root>
    </Stack>
  )
}
