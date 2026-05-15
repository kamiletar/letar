import { getCartItemCount } from '@/app/[locale]/cart/_actions/get-cart'
import { Badge, IconButton, Link } from '@chakra-ui/react'
import NextLink from 'next/link'
import { FiShoppingCart } from 'react-icons/fi'

/**
 * Кнопка корзины с индикатором количества товаров.
 * Server component - получает данные напрямую из БД.
 */
export async function CartButton() {
  const itemCount = await getCartItemCount()

  if (itemCount === 0) {
    return null // Не показываем кнопку, если корзина пуста
  }

  return (
    <Link asChild position="relative">
      <NextLink href="/cart">
        <IconButton aria-label="Корзина" variant="ghost" rounded="full" size="md" colorPalette={'fg'}>
          <FiShoppingCart size={20} />
        </IconButton>
        {itemCount > 0 && (
          <Badge
            position="absolute"
            top="-2px"
            right="-2px"
            colorPalette="fg"
            variant="solid"
            borderRadius="full"
            minW="20px"
            h="20px"
            display="flex"
            alignItems="center"
            justifyContent="center"
            fontSize="xs"
            fontWeight="bold"
          >
            {itemCount > 99 ? '99+' : itemCount}
          </Badge>
        )}
      </NextLink>
    </Link>
  )
}
