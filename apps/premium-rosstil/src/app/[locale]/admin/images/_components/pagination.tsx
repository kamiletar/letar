'use client'

import { useRouter } from '@/i18n/navigation'
import { Button, HStack, Text } from '@chakra-ui/react'
import { useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'

interface PaginationProps {
  page: number
  totalPages: number
  total: number
}

export function Pagination({ page, totalPages, total }: PaginationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (newPage === 1) {
      params.delete('page')
    } else {
      params.set('page', newPage.toString())
    }

    startTransition(() => {
      router.push(`/admin/images?${params.toString()}`)
    })
  }

  if (totalPages <= 1) {
    return (
      <Text fontSize="sm" color="fg.muted">
        Всего записей: {total}
      </Text>
    )
  }

  return (
    <HStack justify="space-between" w="100%">
      <Text fontSize="sm" color="fg.muted">
        Страница {page} из {totalPages} (всего: {total})
      </Text>
      <HStack gap={2}>
        <Button
          size="sm"
          variant="outline"
          onClick={() => goToPage(page - 1)}
          disabled={page === 1 || isPending}
          loading={isPending}
        >
          <FiChevronLeft /> Назад
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => goToPage(page + 1)}
          disabled={page === totalPages || isPending}
          loading={isPending}
        >
          Вперёд <FiChevronRight />
        </Button>
      </HStack>
    </HStack>
  )
}
