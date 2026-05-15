'use client'

/**
 * Кнопка "Показать ещё" — увеличивает limit в URL через searchParams.
 * Используется для server-side пагинации на страницах списков.
 */
import { ITEMS_PER_PAGE } from '@/lib/constants'
import { Button } from '@chakra-ui/react'
import { useRouter, useSearchParams } from 'next/navigation'

export { ITEMS_PER_PAGE }

export function LoadMoreButton({ currentCount, totalCount }: { currentCount: number; totalCount: number }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  if (currentCount >= totalCount) {
    return null
  }

  const handleLoadMore = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('limit', String(currentCount + ITEMS_PER_PAGE))
    router.push(`?${params.toString()}`, { scroll: false })
  }

  return (
    <Button variant="outline" onClick={handleLoadMore} w="full">
      Показать ещё ({totalCount - currentCount} осталось)
    </Button>
  )
}
