'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Button } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { LuPalette } from 'react-icons/lu'
import { seedDefaultColors } from '../_actions/color.action'

export function SeedColorsButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleSeed = () => {
    startTransition(async () => {
      const result = await seedDefaultColors()

      if (result.success) {
        if (result.data?.created === 0) {
          toaster.info({ title: 'Все стандартные цвета уже существуют' })
        } else {
          toaster.success({
            title: `Создано ${result.data?.created} цветов`,
          })
        }
        router.refresh()
      } else {
        toaster.error({ title: 'Ошибка', description: result.error })
      }
    })
  }

  return (
    <Button variant="outline" onClick={handleSeed} loading={isPending}>
      <LuPalette />
      Добавить стандартные
    </Button>
  )
}
