'use client'

/**
 * Add Calendar Dialog
 *
 * Диалог для подключения внешнего календаря (Google Calendar).
 * Показывает список доступных календарей и позволяет выбрать направление синхронизации.
 */

import { Box, Button, Dialog, Flex, HStack, Icon, Portal, RadioCard, Spinner, Stack, Text } from '@chakra-ui/react'
import { useEffect, useState, useTransition } from 'react'
import { LuCalendar, LuDownload, LuRefreshCw, LuUpload } from 'react-icons/lu'
import { SiGoogle } from 'react-icons/si'

import { toaster } from '@/app/_components/ui/toaster'
import type { CalendarSyncDirection } from '@letar/driving-school-db/prisma'
import { connectGoogleCalendarAction, listGoogleCalendarsAction } from '../_actions/calendar.action'

// === Типы ===

interface GoogleCalendar {
  id: string
  name: string
  description?: string
  isPrimary: boolean
  backgroundColor?: string
}

interface AddCalendarDialogProps {
  isOpen: boolean
  onClose: () => void
}

// === Sync Direction Options ===

const syncDirectionOptions: Array<{
  value: CalendarSyncDirection
  label: string
  description: string
  icon: React.ElementType
}> = [
  {
    value: 'EXPORT_ONLY',
    label: 'Только экспорт',
    description: 'Занятия из системы → Google Calendar',
    icon: LuUpload,
  },
  {
    value: 'BIDIRECTIONAL',
    label: 'Двусторонняя',
    description: 'Синхронизация в обе стороны',
    icon: LuRefreshCw,
  },
  {
    value: 'IMPORT_ONLY',
    label: 'Только импорт',
    description: 'Google Calendar → Занятия в системе',
    icon: LuDownload,
  },
]

// === Main Component ===

export function AddCalendarDialog({ isOpen, onClose }: AddCalendarDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([])
  const [selectedCalendar, setSelectedCalendar] = useState<string | null>(null)
  const [syncDirection, setSyncDirection] = useState<CalendarSyncDirection>('EXPORT_ONLY')
  const [isLoading, setIsLoading] = useState(false)
  const [needsAuth, setNeedsAuth] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Загружаем список календарей при открытии
  useEffect(() => {
    if (isOpen) {
      loadCalendars()
    }
  }, [isOpen])

  const loadCalendars = async () => {
    setIsLoading(true)
    setError(null)
    setNeedsAuth(false)

    const result = await listGoogleCalendarsAction()

    if (result.error) {
      if ('needsAuth' in result && result.needsAuth) {
        setNeedsAuth(true)
      } else {
        setError(result.error)
      }
      setCalendars([])
    } else if (result.data) {
      setCalendars(result.data)
      // Автоматически выбираем primary календарь
      const primary = result.data.find((c) => c.isPrimary)
      if (primary) {
        setSelectedCalendar(primary.id)
      }
    }

    setIsLoading(false)
  }

  const handleConnect = () => {
    if (!selectedCalendar) {
      return
    }

    const calendar = calendars.find((c) => c.id === selectedCalendar)
    if (!calendar) {
      return
    }

    startTransition(async () => {
      const result = await connectGoogleCalendarAction({
        calendarId: calendar.id,
        calendarName: calendar.name,
        syncDirection,
      })

      if (result.error) {
        toaster.error({ title: 'Ошибка', description: result.error })
      } else {
        toaster.success({
          title: 'Календарь подключён',
          description: `${calendar.name} успешно добавлен`,
        })
        onClose()
      }
    })
  }

  const handleGoogleSignIn = () => {
    // Редирект на Google OAuth
    // Better Auth обрабатывает это автоматически
    window.location.href = '/api/auth/signin/google'
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="lg">
            <Dialog.Header>
              <Dialog.Title>Подключить Google Calendar</Dialog.Title>
              <Dialog.Description>Синхронизируйте занятия с вашим Google Calendar</Dialog.Description>
            </Dialog.Header>

            <Dialog.Body>
              {isLoading ? (
                <Flex justify="center" py={8}>
                  <Spinner size="lg" />
                </Flex>
              ) : needsAuth ? (
                <Box textAlign="center" py={8}>
                  <Icon as={SiGoogle} boxSize={12} color="fg.subtle" mb={4} />
                  <Text mb={4}>Для доступа к календарям необходимо войти через Google</Text>
                  <Button onClick={handleGoogleSignIn} colorPalette="blue">
                    <SiGoogle />
                    Войти через Google
                  </Button>
                </Box>
              ) : error ? (
                <Box textAlign="center" py={8}>
                  <Text color="red.500" mb={4}>
                    {error}
                  </Text>
                  <Button onClick={loadCalendars} variant="outline">
                    Попробовать снова
                  </Button>
                </Box>
              ) : (
                <Stack gap={6}>
                  {/* Выбор календаря */}
                  <Box>
                    <Text fontWeight="medium" mb={3}>
                      Выберите календарь
                    </Text>
                    <Stack gap={2}>
                      {calendars.map((calendar) => (
                        <Box
                          key={calendar.id}
                          asChild
                          p={3}
                          borderWidth="2px"
                          borderRadius="lg"
                          borderColor={selectedCalendar === calendar.id ? 'blue.500' : 'border'}
                          bg={selectedCalendar === calendar.id ? 'blue.subtle' : 'transparent'}
                          cursor="pointer"
                          _hover={{ borderColor: 'blue.300' }}
                          transition="all 0.2s"
                        >
                          <button type="button" onClick={() => setSelectedCalendar(calendar.id)}>
                            <HStack gap={3}>
                              <Box w={4} h={4} borderRadius="sm" bg={calendar.backgroundColor || 'blue.500'} />
                              <Box flex={1} textAlign="left">
                                <Text fontWeight={calendar.isPrimary ? 'semibold' : 'normal'}>
                                  {calendar.name}
                                  {calendar.isPrimary && (
                                    <Text as="span" color="fg.muted" fontSize="sm" ml={2}>
                                      (основной)
                                    </Text>
                                  )}
                                </Text>
                                {calendar.description && (
                                  <Text fontSize="sm" color="fg.muted">
                                    {calendar.description}
                                  </Text>
                                )}
                              </Box>
                            </HStack>
                          </button>
                        </Box>
                      ))}
                    </Stack>
                  </Box>

                  {/* Выбор направления синхронизации */}
                  <Box>
                    <Text fontWeight="medium" mb={3}>
                      Направление синхронизации
                    </Text>
                    <RadioCard.Root
                      value={syncDirection}
                      onValueChange={(e) => setSyncDirection(e.value as CalendarSyncDirection)}
                    >
                      <HStack gap={3} flexWrap="wrap">
                        {syncDirectionOptions.map((option) => (
                          <RadioCard.Item key={option.value} value={option.value}>
                            <RadioCard.ItemHiddenInput />
                            <RadioCard.ItemControl>
                              <RadioCard.ItemContent>
                                <HStack>
                                  <Icon as={option.icon} boxSize={5} />
                                  <Box>
                                    <RadioCard.ItemText>{option.label}</RadioCard.ItemText>
                                    <RadioCard.ItemDescription>{option.description}</RadioCard.ItemDescription>
                                  </Box>
                                </HStack>
                              </RadioCard.ItemContent>
                              <RadioCard.ItemIndicator />
                            </RadioCard.ItemControl>
                          </RadioCard.Item>
                        ))}
                      </HStack>
                    </RadioCard.Root>
                  </Box>
                </Stack>
              )}
            </Dialog.Body>

            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">Отмена</Button>
              </Dialog.ActionTrigger>
              <Button
                onClick={handleConnect}
                colorPalette="blue"
                disabled={!selectedCalendar || isPending || isLoading || needsAuth}
              >
                {isPending ? <Spinner size="sm" /> : <LuCalendar />}
                Подключить
              </Button>
            </Dialog.Footer>

            <Dialog.CloseTrigger />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
