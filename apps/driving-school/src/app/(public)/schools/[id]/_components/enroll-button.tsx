'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Button } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useOptimistic, useTransition } from 'react'
import { createEnrollmentAction } from '../_actions/enrollment.action'

interface EnrollButtonProps {
  schoolId: string
  isAuthenticated: boolean
}

export function EnrollButton({ schoolId, isAuthenticated }: EnrollButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [optimisticEnrolled, setOptimisticEnrolled] = useOptimistic(false)

  const handleEnroll = () => {
    startTransition(async () => {
      // Мгновенное отображение "Заявка отправлена"
      setOptimisticEnrolled(true)

      const result = await createEnrollmentAction(schoolId)

      if (result?.error) {
        queueMicrotask(() => {
          toaster.error({
            title: 'Ошибка',
            description: result.error,
          })
        })
        router.refresh() // Вернёт реальное значение
        return
      }

      if (result?.success) {
        queueMicrotask(() => {
          toaster.success({
            title: 'Заявка отправлена',
            description: `Ваша заявка в школу "${result.schoolName}" отправлена. Менеджер школы свяжется с вами.`,
          })
        })
        router.refresh()
      }
    })
  }

  if (optimisticEnrolled) {
    return (
      <Button colorPalette="green" size="lg" width="full" disabled>
        Заявка отправлена
      </Button>
    )
  }

  return (
    <Button
      colorPalette="brand"
      size="lg"
      width="full"
      onClick={handleEnroll}
      loading={isPending}
      loadingText="Отправка..."
    >
      {isAuthenticated ? 'Записаться в школу' : 'Войти и записаться'}
    </Button>
  )
}
