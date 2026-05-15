'use client'

import { useCart } from '@/app/_components/cart'
import { toaster } from '@/app/_components/ui/toaster'
import { Link as LocalizedLink } from '@/i18n/navigation'
import { Button, Stack } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { LuCheck, LuShoppingCart } from 'react-icons/lu'

/** Товар с URL для кнопки добавления в корзину */
interface ProductForCart {
  id: string
  slug: string
  name: string
  price: number
  firstImageUrl: string | null
}

interface AddToCartButtonProps {
  product: ProductForCart
}

export function AddToCartButton({ product }: AddToCartButtonProps) {
  const t = useTranslations('shop.product')
  const { addItem, items } = useCart()

  const isInCart = items.some((item) => item.productId === product.id)

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      productSlug: product.slug,
      name: product.name,
      price: product.price,
      imageUrl: product.firstImageUrl,
    })

    toaster.success({
      title: t('addedToCart'),
      description: product.name,
    })
  }

  if (isInCart) {
    return (
      <Stack direction={{ base: 'column', sm: 'row' }} gap={3}>
        <Button size="xl" variant="outline" colorPalette="green" disabled width={{ base: 'full', sm: 'auto' }}>
          <LuCheck />
          {t('inCartButton')}
        </Button>
        <Button size="xl" colorPalette="fg" asChild width={{ base: 'full', sm: 'auto' }}>
          <LocalizedLink href="/cart">{t('goToCart')}</LocalizedLink>
        </Button>
      </Stack>
    )
  }

  return (
    <Button size="xl" colorPalette="fg" onClick={handleAddToCart} width={{ base: 'full', md: 'auto' }}>
      <LuShoppingCart />
      {t('addToCartButton')}
    </Button>
  )
}
