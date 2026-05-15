'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@chakra-ui/react'
import { useState, useTransition } from 'react'
import { FiTrash2 } from 'react-icons/fi'
import { deleteUnusedImages } from '../_actions/delete-image'

interface CleanupButtonProps {
  unusedCount: number
}

export function CleanupButton({ unusedCount }: CleanupButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleCleanup = async () => {
    if (unusedCount === 0) {
      toaster.info({
        title: 'Нет неиспользуемых изображений',
      })
      return
    }

    if (!confirm(`Удалить ${unusedCount} неиспользуемых изображений? Это действие необратимо.`)) {
      return
    }

    setIsDeleting(true)

    try {
      const result = await deleteUnusedImages()

      if (result.success) {
        toaster.success({
          title: 'Очистка завершена',
          description: `Удалено ${result.deleted} изображений`,
        })
        startTransition(() => {
          router.refresh()
        })
      } else {
        toaster.error({
          title: 'Ошибка очистки',
          description: result.error,
        })
      }
    } finally {
      setIsDeleting(false)
    }
  }

  if (unusedCount === 0) {
    return null
  }

  return (
    <Button size="sm" colorPalette="red" onClick={handleCleanup} loading={isDeleting || isPending}>
      <FiTrash2 /> Удалить неиспользуемые ({unusedCount})
    </Button>
  )
}
