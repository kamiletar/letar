'use client'

/**
 * Кнопки публикации матча в Telegram.
 * Анонс, итог тайма, финальный результат.
 */

import { toaster } from '@/app/_components/ui/toaster'
import { Button, Flex, Menu, Text } from '@chakra-ui/react'
import { useTransition } from 'react'
import { LuChevronDown, LuMegaphone, LuSend, LuTrophy } from 'react-icons/lu'

import { publishAnnouncementAction, publishHalfTimeAction, publishResultAction } from '../_actions/telegram.action'

interface TelegramActionsProps {
  matchId: string
  status: string
  hasTelegramChannel: boolean
}

export function TelegramActions({ matchId, status, hasTelegramChannel }: TelegramActionsProps) {
  const [pending, startTransition] = useTransition()

  if (!hasTelegramChannel) {
    return null
  }

  const handleAnnouncement = () => {
    startTransition(async () => {
      const result = await publishAnnouncementAction(matchId)
      if (result.success) {
        toaster.success({ title: 'Анонс опубликован в Telegram' })
      } else {
        toaster.error({ title: result.error })
      }
    })
  }

  const handleHalfTime = (half: number) => {
    startTransition(async () => {
      const result = await publishHalfTimeAction(matchId, half)
      if (result.success) {
        toaster.success({ title: `Итог ${half}-го тайма опубликован` })
      } else {
        toaster.error({ title: result.error })
      }
    })
  }

  const handleResult = () => {
    startTransition(async () => {
      const result = await publishResultAction(matchId)
      if (result.success) {
        toaster.success({ title: 'Результат опубликован в Telegram' })
      } else {
        toaster.error({ title: result.error })
      }
    })
  }

  const isScheduled = status === 'SCHEDULED'
  const isLive = status === 'LIVE'
  const isFinished = status === 'FINISHED'

  return (
    <Flex gap={2} wrap="wrap">
      {/* Анонс — для запланированных и LIVE */}
      {(isScheduled || isLive) && (
        <Button size="sm" variant="outline" onClick={handleAnnouncement} loading={pending}>
          <LuMegaphone />
          Анонс в Telegram
        </Button>
      )}

      {/* Итог тайма — для LIVE */}
      {isLive && (
        <Menu.Root>
          <Menu.Trigger asChild>
            <Button size="sm" variant="outline" loading={pending}>
              <LuSend />
              Итог тайма
              <LuChevronDown />
            </Button>
          </Menu.Trigger>
          <Menu.Positioner>
            <Menu.Content>
              <Menu.Item value="half1" onClick={() => handleHalfTime(1)}>
                <Text>1-й тайм</Text>
              </Menu.Item>
              <Menu.Item value="half2" onClick={() => handleHalfTime(2)}>
                <Text>2-й тайм</Text>
              </Menu.Item>
            </Menu.Content>
          </Menu.Positioner>
        </Menu.Root>
      )}

      {/* Результат — для завершённых */}
      {isFinished && (
        <Button size="sm" variant="outline" onClick={handleResult} loading={pending}>
          <LuTrophy />
          Результат в Telegram
        </Button>
      )}
    </Flex>
  )
}
