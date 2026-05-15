/**
 * Popover для планирования установки обновления
 *
 * Позволяет пользователю выбрать время установки:
 * - При закрытии приложения
 * - Через 1 час
 * - Через 4 часа
 * - Завтра в 9:00
 */

'use client'

import { Button, Popover, PopoverBody, PopoverContent, PopoverTrigger, Stack, Text } from '@chakra-ui/react'
import { LuCalendar, LuChevronDown } from 'react-icons/lu'
import { useUpdateStore } from './update-store'

interface ScheduleOption {
  label: string
  description: string
  getDate: () => Date | null
}

/**
 * Popover для выбора времени установки обновления
 *
 * @example
 * ```tsx
 * // В UpdateDrawer
 * <UpdateSchedulePopover onSchedule={() => setDrawerOpen(false)} />
 * ```
 */
export function UpdateSchedulePopover({ onSchedule }: { onSchedule?: () => void }) {
  const scheduleInstall = useUpdateStore((state) => state.scheduleInstall)

  const options: ScheduleOption[] = [
    {
      label: 'При закрытии',
      description: 'Установить при следующем закрытии приложения',
      getDate: () => null, // null означает "при закрытии"
    },
    {
      label: 'Через 1 час',
      description: 'Установить примерно через час',
      getDate: () => {
        const date = new Date()
        date.setHours(date.getHours() + 1)
        return date
      },
    },
    {
      label: 'Через 4 часа',
      description: 'Установить примерно через 4 часа',
      getDate: () => {
        const date = new Date()
        date.setHours(date.getHours() + 4)
        return date
      },
    },
    {
      label: 'Завтра в 9:00',
      description: 'Установить завтра утром',
      getDate: () => {
        const date = new Date()
        date.setDate(date.getDate() + 1)
        date.setHours(9, 0, 0, 0)
        return date
      },
    },
  ]

  const handleSelect = (option: ScheduleOption) => {
    const date = option.getDate()
    scheduleInstall(date)
    onSchedule?.()
  }

  return (
    <Popover.Root positioning={{ placement: 'top-start' }}>
      <PopoverTrigger asChild>
        <Button variant="outline" colorPalette="purple">
          <LuCalendar />
          Запланировать
          <LuChevronDown />
        </Button>
      </PopoverTrigger>

      <PopoverContent>
        <PopoverBody>
          <Stack gap="1">
            {options.map((option, index) => (
              <Button
                key={index}
                variant="ghost"
                justifyContent="start"
                h="auto"
                py="2"
                px="3"
                onClick={() => handleSelect(option)}
              >
                <Stack gap="0.5" align="start">
                  <Text fontWeight="medium" fontSize="sm">
                    {option.label}
                  </Text>
                  <Text fontSize="xs" color="fg.muted" fontWeight="normal">
                    {option.description}
                  </Text>
                </Stack>
              </Button>
            ))}
          </Stack>
        </PopoverBody>
      </PopoverContent>
    </Popover.Root>
  )
}
