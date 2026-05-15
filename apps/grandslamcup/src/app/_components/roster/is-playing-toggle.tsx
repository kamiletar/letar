'use client'

/**
 * Переключатель «играющий» для тренеров/замов.
 * Используется в админке и кабинете тренера.
 */

import { toaster } from '@/app/_components/ui/toaster'
import { HStack, Switch, Text } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface IsPlayingToggleProps {
  ptsId: string
  isPlaying: boolean
  /** Server action для переключения (разный в admin/coach) */
  toggleAction: (input: {
    playerTeamSeasonId: string
    isPlaying: boolean
  }) => Promise<{ error?: string } | { success: boolean }>
}

export function IsPlayingToggle({ ptsId, isPlaying, toggleAction }: IsPlayingToggleProps) {
  const router = useRouter()
  const [checked, setChecked] = useState(isPlaying)
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    const newValue = !checked
    setChecked(newValue)
    setLoading(true)
    try {
      const result = await toggleAction({
        playerTeamSeasonId: ptsId,
        isPlaying: newValue,
      })
      if ('error' in result && result.error) {
        setChecked(!newValue)
        toaster.error({ title: String(result.error) })
      } else {
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <HStack gap={1}>
      <Switch.Root size="sm" checked={checked} onCheckedChange={handleToggle} disabled={loading}>
        <Switch.HiddenInput />
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
      </Switch.Root>
      <Text fontSize="xs" color="fg.muted">
        играющий
      </Text>
    </HStack>
  )
}
