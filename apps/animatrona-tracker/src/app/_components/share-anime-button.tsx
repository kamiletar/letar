'use client'

/**
 * Кнопка «Поделиться» для страницы аниме — канонический URL без тайм-кода
 * (в отличие от кнопки в плеере, которая шарит момент просмотра).
 */

import { IconButton } from '@chakra-ui/react'
import { useShare } from '@letar/ui'
import { useCallback } from 'react'
import { LuShare2 } from 'react-icons/lu'

import { toaster } from '@/app/_components/ui/toaster'

interface ShareAnimeButtonProps {
  title: string
}

export function ShareAnimeButton({ title }: ShareAnimeButtonProps) {
  const { share } = useShare()

  const handleShare = useCallback(async () => {
    const url = window.location.href
    const outcome = await share({ title, url }, url)
    if (outcome === 'copied') {
      toaster.success({ title: 'Ссылка скопирована' })
    }
  }, [share, title])

  return (
    <IconButton aria-label="Поделиться" variant="outline" onClick={handleShare}>
      <LuShare2 />
    </IconButton>
  )
}
