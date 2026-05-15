'use client'

/**
 * Секция привязки Telegram на странице профиля.
 *
 * Показывает кнопку «Привязать Telegram» (открывает t.me/{bot}?start=link_{userId})
 * или статус «Привязан» с возможностью отвязки.
 *
 * Цепочка работает только если в админке /admin/settings включён бот:
 * - getTelegramLinkUrlAction вернёт url через бот username
 * - после клика на кнопку и /start в Telegram → webhook сохранит chatId
 * - после возвращения на страницу профиля показывается «Привязан»
 */

import { toaster } from '@/app/_components/ui/toaster'
import { getTelegramLinkUrlAction, unlinkTelegramAction } from '@/app/profile/_actions/telegram-link.action'
import { Badge, Box, Button, Heading, HStack, Spinner, Text, VStack } from '@chakra-ui/react'
import { useEffect, useState, useTransition } from 'react'
import { LuLink, LuRefreshCw, LuSend, LuUnlink } from 'react-icons/lu'

interface LinkInfo {
  url: string
  isLinked: boolean
  chatId: string | null
}

export function TelegramLinkSection() {
  const [info, setInfo] = useState<LinkInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unlinking, startUnlink] = useTransition()

  const refresh = async () => {
    setLoading(true)
    setError(null)
    const result = await getTelegramLinkUrlAction()
    if (result.success) {
      setInfo({ url: result.url, isLinked: result.isLinked, chatId: result.chatId })
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [])

  const handleUnlink = () => {
    startUnlink(async () => {
      const result = await unlinkTelegramAction()
      if (result.success) {
        toaster.success({ title: 'Telegram отвязан' })
        await refresh()
      }
    })
  }

  return (
    <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border" p={8}>
      <VStack gap={4} align="stretch">
        <HStack gap={3}>
          <Box color="brand.solid" fontSize="2xl">
            <LuSend />
          </Box>
          <Box>
            <Heading size="md">Telegram</Heading>
            <Text fontSize="sm" color="fg.muted">
              Личные уведомления о матчах прямо в Telegram
            </Text>
          </Box>
        </HStack>

        {loading && (
          <HStack gap={2} color="fg.muted">
            <Spinner size="sm" />
            <Text fontSize="sm">Загрузка...</Text>
          </HStack>
        )}

        {error && (
          <Box p={3} bg="red.subtle" borderRadius="md">
            <Text fontSize="sm" color="red.fg">
              {error}
            </Text>
          </Box>
        )}

        {info && info.isLinked && (
          <VStack gap={3} align="stretch">
            <HStack gap={2}>
              <Badge colorPalette="green" size="md">
                Привязан
              </Badge>
              <Text fontSize="xs" color="fg.muted" fontFamily="mono">
                chatId: {info.chatId}
              </Text>
            </HStack>
            <HStack gap={2}>
              <Button size="sm" variant="outline" colorPalette="red" onClick={handleUnlink} loading={unlinking}>
                <LuUnlink />
                Отвязать
              </Button>
              <Button size="sm" variant="ghost" onClick={refresh}>
                <LuRefreshCw />
                Обновить
              </Button>
            </HStack>
          </VStack>
        )}

        {info && !info.isLinked && (
          <VStack gap={3} align="stretch">
            <Text fontSize="sm" color="fg.muted">
              Нажмите кнопку, чтобы открыть бота в Telegram и подтвердить привязку через «Старт».
            </Text>
            <HStack gap={2}>
              <Box asChild>
                <a href={info.url} target="_blank" rel="noopener noreferrer">
                  <Button colorPalette="brand">
                    <LuLink />
                    Привязать Telegram
                  </Button>
                </a>
              </Box>
              <Button size="sm" variant="ghost" onClick={refresh}>
                <LuRefreshCw />Я уже привязал
              </Button>
            </HStack>
          </VStack>
        )}
      </VStack>
    </Box>
  )
}
