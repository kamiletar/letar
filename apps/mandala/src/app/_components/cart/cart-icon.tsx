'use client'

import { Badge, Box, IconButton, Link } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { LuShoppingCart } from 'react-icons/lu'
import { useCartState } from './cart-context'

export function CartIcon() {
  const t = useTranslations('nav')
  const { itemCount } = useCartState()

  return (
    <Box position="relative">
      <IconButton asChild variant="ghost" size="sm" aria-label={t('cart')}>
        <Link href="/cart">
          <LuShoppingCart size={20} />
        </Link>
      </IconButton>
      {itemCount > 0 && (
        <Badge
          position="absolute"
          top="-1"
          right="-1"
          colorPalette="red"
          fontSize="xs"
          borderRadius="full"
          minW="18px"
          h="18px"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          {itemCount > 99 ? '99+' : itemCount}
        </Badge>
      )}
    </Box>
  )
}
