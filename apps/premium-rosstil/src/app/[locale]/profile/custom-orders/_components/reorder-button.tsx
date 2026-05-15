'use client'

import type { CustomOrderType } from '@/generated/prisma'
import { Link } from '@/i18n/navigation'
import { Button } from '@chakra-ui/react'
import { LuRefreshCw } from 'react-icons/lu'

interface ReorderButtonProps {
  orderType: CustomOrderType
  productId: string | null
}

/**
 * Button to repeat a completed order.
 * - For orders with product: redirects to product page
 * - For CUSTOM_DESIGN without product: redirects to contacts page
 */
export function ReorderButton({ orderType, productId }: ReorderButtonProps) {
  // CUSTOM_DESIGN orders without product - redirect to contacts
  if (orderType === 'CUSTOM_DESIGN' && !productId) {
    return (
      <Button asChild colorPalette="fg" size="lg" w="full">
        <Link href="/contacts">
          <LuRefreshCw />
          Связаться для нового заказа
        </Link>
      </Button>
    )
  }

  // Orders with product - redirect to product page
  if (productId) {
    return (
      <Button asChild colorPalette="fg" size="lg" w="full">
        <Link href={`/catalog/${productId}`}>
          <LuRefreshCw />
          Заказать снова
        </Link>
      </Button>
    )
  }

  // Fallback - shouldn't happen normally
  return null
}
