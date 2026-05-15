'use client'

import { Button, HStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { restoreProductAction, setPublishedAction, softDeleteProductAction } from '../../../_actions/products.action'

export function ProductActions({
  productId,
  published,
  deleted,
}: {
  productId: string
  published: boolean
  deleted: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function run(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn()
      router.refresh()
    })
  }

  if (deleted) {
    return (
      <HStack gap={2}>
        <Button
          colorPalette="green"
          loading={isPending}
          onClick={() => run(() => restoreProductAction(productId))}
        >
          Восстановить
        </Button>
      </HStack>
    )
  }

  return (
    <HStack gap={2}>
      <Button
        variant="outline"
        loading={isPending}
        onClick={() => run(() => setPublishedAction(productId, !published))}
      >
        {published ? 'Снять с публикации' : 'Опубликовать'}
      </Button>
      <Button
        colorPalette="red"
        variant="outline"
        loading={isPending}
        onClick={() => {
          if (!confirm('Удалить товар? (можно восстановить)')) return
          run(() => softDeleteProductAction(productId))
        }}
      >
        Удалить
      </Button>
    </HStack>
  )
}
