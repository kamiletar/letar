'use client'

/**
 * Кнопка дисквалификации за плагиат (чтение чужих стихов).
 * Диалог подтверждения → обнуление оценок + сезонная дисквалификация.
 */

import { toaster } from '@/app/_components/ui/toaster'
import { disqualifyForPlagiarismAction } from '@/app/admin/suspensions/_actions/suspension.action'
import { Button, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LuTriangleAlert } from 'react-icons/lu'

interface PlagiarismButtonProps {
  performanceId: string
  playerName: string
}

export function PlagiarismButton({ performanceId, playerName }: PlagiarismButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  const handleClick = () => {
    if (!confirming) {
      setConfirming(true)
      return
    }

    // Подтверждено — выполняем
    setSubmitting(true)
    disqualifyForPlagiarismAction({ performanceId })
      .then((result) => {
        if ('error' in result) {
          toaster.error({ title: String(result.error) })
        } else {
          toaster.success({
            title: `${playerName} дисквалифицирован за плагиат`,
            description: 'Оценки обнулены, дисквалификация до конца сезона',
          })
          router.refresh()
        }
      })
      .finally(() => {
        setSubmitting(false)
        setConfirming(false)
      })
  }

  if (confirming) {
    return (
      <VStack gap={1} align="stretch">
        <Text fontSize="xs" color="red.fg" fontWeight="medium">
          <LuTriangleAlert size={12} style={{ display: 'inline', marginRight: 4 }} />
          Подтвердите
        </Text>
        <Button size="xs" colorPalette="red" onClick={handleClick} loading={submitting}>
          Да, плагиат
        </Button>
        <Button size="xs" variant="ghost" onClick={() => setConfirming(false)} disabled={submitting}>
          Отмена
        </Button>
      </VStack>
    )
  }

  return (
    <Button size="xs" variant="outline" colorPalette="purple" onClick={handleClick}>
      Плагиат
    </Button>
  )
}
