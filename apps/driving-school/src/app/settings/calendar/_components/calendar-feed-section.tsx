'use client'

/**
 * Calendar Feed Section
 *
 * Компонент для управления iCal feed URL.
 * Позволяет копировать URL и настраивать что включать в feed.
 */

import {
  Box,
  Button,
  Card,
  Clipboard,
  Flex,
  Heading,
  HStack,
  Icon,
  Input,
  Spinner,
  Stack,
  Switch,
  Text,
} from '@chakra-ui/react'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { LuCalendar, LuCheck, LuCopy, LuExternalLink, LuRefreshCw } from 'react-icons/lu'

import { toaster } from '@/app/_components/ui/toaster'
import type { CalendarFeed } from '@letar/driving-school-db/prisma'
import { regenerateFeedTokenAction, updateFeedSettingsAction } from '../_actions/calendar.action'

interface CalendarFeedSectionProps {
  feed: CalendarFeed | null
  baseUrl: string
}

export function CalendarFeedSection({ feed, baseUrl }: CalendarFeedSectionProps) {
  const [isPending, startTransition] = useTransition()
  const [settings, setSettings] = useState({
    includeLessons: feed?.includeLessons ?? true,
    includeExams: feed?.includeExams ?? true,
    includeTheoryLessons: feed?.includeTheoryLessons ?? true,
    includeAbsences: feed?.includeAbsences ?? false,
  })

  const feedUrl = feed ? `${baseUrl}/api/calendar/feed/${feed.token}` : null
  const webcalUrl = feedUrl?.replace('https://', 'webcal://').replace('http://', 'webcal://')

  const handleSettingChange = (key: keyof typeof settings, value: boolean) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)

    startTransition(async () => {
      const result = await updateFeedSettingsAction(newSettings)
      if (result.error) {
        toaster.error({ title: 'Ошибка', description: result.error })
        // Откатываем изменение
        setSettings(settings)
      }
    })
  }

  const handleRegenerateToken = () => {
    startTransition(async () => {
      const result = await regenerateFeedTokenAction()
      if (result.error) {
        toaster.error({ title: 'Ошибка', description: result.error })
      } else {
        toaster.success({
          title: 'Токен обновлён',
          description: 'Старая ссылка больше не работает. Обновите подписку в календаре.',
        })
      }
    })
  }

  return (
    <Card.Root>
      <Card.Header>
        <Flex align="center" gap={2}>
          <Icon asChild color="blue.500">
            <LuCalendar />
          </Icon>
          <Heading size="md">iCal Feed</Heading>
        </Flex>
        <Text color="fg.muted" fontSize="sm">
          Подпишитесь на этот URL в любом календарном приложении
        </Text>
      </Card.Header>

      <Card.Body>
        <Stack gap={6}>
          {/* URL для копирования */}
          <Box>
            <Text fontWeight="medium" mb={2}>
              URL для подписки
            </Text>
            <HStack>
              <Input value={webcalUrl || 'Загрузка...'} readOnly fontFamily="mono" fontSize="sm" />
              <Clipboard.Root value={webcalUrl || ''}>
                <Clipboard.Trigger asChild>
                  <Button variant="outline" size="sm">
                    <Clipboard.Indicator copied={<LuCheck />}>
                      <LuCopy />
                    </Clipboard.Indicator>
                  </Button>
                </Clipboard.Trigger>
              </Clipboard.Root>
            </HStack>
            <Text color="fg.muted" fontSize="xs" mt={1}>
              Используйте webcal:// ссылку для автоматической подписки
            </Text>
          </Box>

          {/* Кнопки действий */}
          <HStack>
            <Button variant="outline" size="sm" onClick={handleRegenerateToken} disabled={isPending}>
              {isPending ? <Spinner size="sm" /> : <LuRefreshCw />}
              Сменить ссылку
            </Button>
            {feedUrl && (
              <Button variant="ghost" size="sm" asChild>
                <Link href={feedUrl} target="_blank" rel="noopener noreferrer">
                  <LuExternalLink />
                  Открыть
                </Link>
              </Button>
            )}
          </HStack>

          {/* Настройки контента */}
          <Box>
            <Text fontWeight="medium" mb={3}>
              Что включить в календарь
            </Text>
            <Stack gap={3}>
              <Flex justify="space-between" align="center">
                <Box>
                  <Text>Практические занятия</Text>
                  <Text color="fg.muted" fontSize="sm">
                    Уроки вождения с инструктором
                  </Text>
                </Box>
                <Switch.Root
                  checked={settings.includeLessons}
                  onCheckedChange={(e) => handleSettingChange('includeLessons', e.checked)}
                  disabled={isPending}
                >
                  <Switch.HiddenInput />
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Root>
              </Flex>

              <Flex justify="space-between" align="center">
                <Box>
                  <Text>Экзамены</Text>
                  <Text color="fg.muted" fontSize="sm">
                    Внутренние и ГИБДД экзамены
                  </Text>
                </Box>
                <Switch.Root
                  checked={settings.includeExams}
                  onCheckedChange={(e) => handleSettingChange('includeExams', e.checked)}
                  disabled={isPending}
                >
                  <Switch.HiddenInput />
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Root>
              </Flex>

              <Flex justify="space-between" align="center">
                <Box>
                  <Text>Теоретические занятия</Text>
                  <Text color="fg.muted" fontSize="sm">
                    Лекции и занятия в группах
                  </Text>
                </Box>
                <Switch.Root
                  checked={settings.includeTheoryLessons}
                  onCheckedChange={(e) => handleSettingChange('includeTheoryLessons', e.checked)}
                  disabled={isPending}
                >
                  <Switch.HiddenInput />
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Root>
              </Flex>

              <Flex justify="space-between" align="center">
                <Box>
                  <Text>Отсутствия</Text>
                  <Text color="fg.muted" fontSize="sm">
                    Периоды недоступности (для инструкторов)
                  </Text>
                </Box>
                <Switch.Root
                  checked={settings.includeAbsences}
                  onCheckedChange={(e) => handleSettingChange('includeAbsences', e.checked)}
                  disabled={isPending}
                >
                  <Switch.HiddenInput />
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Root>
              </Flex>
            </Stack>
          </Box>

          {/* Статистика */}
          {feed && (
            <Box borderTop="1px solid" borderColor="border.muted" pt={4}>
              <Text color="fg.muted" fontSize="sm">
                Последний доступ:{' '}
                {feed.lastAccessedAt ? new Date(feed.lastAccessedAt).toLocaleString('ru-RU') : 'никогда'}
                {' · '}
                Всего запросов: {feed.accessCount}
              </Text>
            </Box>
          )}
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}
