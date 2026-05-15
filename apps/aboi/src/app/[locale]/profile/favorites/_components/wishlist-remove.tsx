'use client'

import { Button } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { toggleWishlistAction } from '../../_actions/profile.action'

export function WishlistRemoveButton({ productId }: { productId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      size="xs"
      variant="ghost"
      colorPalette="red"
      loading={isPending}
      onClick={() =>
        startTransition(async () => {
          await toggleWishlistAction(productId)
          router.refresh()
        })}
    >
      Убрать из избранного
    </Button>
  )
}
