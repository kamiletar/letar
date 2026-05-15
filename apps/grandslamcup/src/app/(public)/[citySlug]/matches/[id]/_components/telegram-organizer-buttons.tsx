'use client'

/**
 * Кнопки публикации матча в Telegram — для организаторов города.
 * Показываются только если canPublish=true (проверка на сервере).
 */

import { toaster } from '@/app/_components/ui/toaster'
import { Button, HStack } from '@chakra-ui/react'
import { useState } from 'react'
import { LuSend } from 'react-icons/lu'
import { publishMatchAnnouncementAction, publishMatchResultAction } from '../_actions/match-organizer.action'

interface TelegramOrganizerButtonsProps {
  matchId: string
  /** true — матч завершён, показываем кнопку результата вместо анонса */
  isFinished: boolean
  /** Серверная проверка: организатор города или admin */
  canPublish: boolean
}

export function TelegramOrganizerButtons({ matchId, isFinished, canPublish }: TelegramOrganizerButtonsProps) {
  const [loading, setLoading] = useState(false)

  if (!canPublish) return null

  async function handleAnnouncement() {
    setLoading(true)
    try {
      const res = await publishMatchAnnouncementAction(matchId)
      if (res.success) {
        toaster.success({ title: 'Анонс опубликован в Telegram' })
      } else {
        toaster.error({ title: res.error ?? 'Ошибка публикации' })
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleResult() {
    setLoading(true)
    try {
      const res = await publishMatchResultAction(matchId)
      if (res.success) {
        toaster.success({ title: 'Результат опубликован в Telegram' })
      } else {
        toaster.error({ title: res.error ?? 'Ошибка публикации' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <HStack gap={2}>
      {!isFinished && (
        <Button size="xs" variant="outline" colorPalette="cyan" onClick={handleAnnouncement} loading={loading}>
          <LuSend size={13} />
          Анонс в Telegram
        </Button>
      )}
      {isFinished && (
        <Button size="xs" variant="outline" colorPalette="cyan" onClick={handleResult} loading={loading}>
          <LuSend size={13} />
          Результат в Telegram
        </Button>
      )}
    </HStack>
  )
}
