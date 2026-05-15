'use client'

import { Box, Card, Heading, HStack, Icon, List, Text, VStack } from '@chakra-ui/react'
import { useDeclarativeForm } from '@letar/forms'
import { LuCalendar, LuCar, LuCheck, LuDollarSign, LuLightbulb, LuMapPin, LuUser } from 'react-icons/lu'
import type { InstructorOnboardingFormData, WeeklySchedule } from '../../_schemas/instructor-onboarding.schema'

interface Step6CompleteProps {
  userName: string
}

const DAYS_LABELS: Record<string, string> = {
  monday: 'Пн',
  tuesday: 'Вт',
  wednesday: 'Ср',
  thursday: 'Чт',
  friday: 'Пт',
  saturday: 'Сб',
  sunday: 'Вс',
}

// Группируем дни по времени работы
function groupDaysByTime(workingHours: WeeklySchedule): { days: string[]; open: string; close: string }[] {
  const groups: Map<string, string[]> = new Map()

  for (const [day, time] of Object.entries(workingHours)) {
    if (time !== null) {
      const key = `${time.open}-${time.close}`
      const existing = groups.get(key) || []
      existing.push(day)
      groups.set(key, existing)
    }
  }

  return Array.from(groups.entries()).map(([timeKey, days]) => {
    const [open, close] = timeKey.split('-')
    return { days, open, close }
  })
}

/**
 * Шаг 6: Завершение
 * Показывает preview профиля и чеклист заполненности.
 * Читает данные формы через useDeclarativeForm.
 */
export function Step6Complete({ userName }: Step6CompleteProps) {
  const { form } = useDeclarativeForm()
  const formData = form.state.values as InstructorOnboardingFormData

  const { basicInfo, vehicle, schedule, pricing } = formData

  // Чеклист заполненности
  const checklist = [
    {
      label: 'Стаж работы',
      filled: !!basicInfo.experienceStartDate,
      icon: LuUser,
    },
    {
      label: 'Категории прав',
      filled: (basicInfo.licenseCategories?.length ?? 0) > 0,
      icon: LuUser,
    },
    {
      label: 'Автомобиль',
      filled: !!vehicle.brand && !!vehicle.model,
      icon: LuCar,
    },
    {
      label: 'Расписание',
      filled: schedule.workingHours ? groupDaysByTime(schedule.workingHours).length > 0 : false,
      icon: LuCalendar,
    },
    {
      label: 'Стоимость занятия',
      filled: (pricing.basePrice ?? 0) > 0,
      icon: LuDollarSign,
    },
    {
      label: 'Районы работы',
      filled: (pricing.workingAreas?.length ?? 0) > 0,
      icon: LuMapPin,
    },
  ]

  const filledCount = checklist.filter((item) => item.filled).length
  const completenessPercent = Math.round((filledCount / checklist.length) * 100)

  // Советы для начинающих
  const tips = [
    'Отвечайте на заявки в течение часа — это повышает конверсию',
    'Просите учеников оставлять отзывы после занятий',
    'Обновляйте расписание регулярно',
    'Добавьте аватар — профили с фото получают на 40% больше заявок',
  ]

  return (
    <Card.Root>
      <Card.Header textAlign="center">
        <Heading size="xl" mb={2}>
          Профиль готов!
        </Heading>
        <Text color="fg.muted" fontSize="lg">
          {userName ? `${userName}, ваш` : 'Ваш'} профиль заполнен на {completenessPercent}%
        </Text>
      </Card.Header>

      <Card.Body>
        <VStack gap={8} align="stretch">
          {/* Превью профиля */}
          <Box p={6} borderRadius="xl" bg="bg.subtle" borderWidth="1px" borderColor="border">
            <VStack align="start" gap={4}>
              <Heading size="md">{userName || 'Инструктор'}</Heading>

              <HStack gap={2} flexWrap="wrap">
                <Icon color="fg.muted">
                  <LuCar />
                </Icon>
                <Text>
                  {vehicle.brand} {vehicle.model}
                  {vehicle.transmission === 'AUTOMATIC' ? ' (АКПП)' : ' (МКПП)'}
                </Text>
              </HStack>

              {schedule.workingHours &&
                (() => {
                  const groups = groupDaysByTime(schedule.workingHours)
                  if (groups.length === 0) {
                    return null
                  }
                  return (
                    <VStack align="start" gap={1}>
                      {groups.map((group) => (
                        <HStack key={`${group.days.join('-')}-${group.open}-${group.close}`} gap={2} flexWrap="wrap">
                          <Icon color="fg.muted">
                            <LuCalendar />
                          </Icon>
                          <Text>
                            {group.days.map((day) => DAYS_LABELS[day]).join(', ')} • {group.open}-{group.close}
                          </Text>
                        </HStack>
                      ))}
                    </VStack>
                  )
                })()}

              <VStack align="start" gap={1}>
                <HStack gap={2}>
                  <Icon color="fg.muted">
                    <LuDollarSign />
                  </Icon>
                  <Text fontWeight="bold" color="brand.solid">
                    {(pricing.basePrice ?? 0).toLocaleString()} ₽ / занятие
                  </Text>
                </HStack>
                {pricing.studentCarPrice && pricing.studentCarPrice > 0 && (
                  <HStack gap={2} ps={6}>
                    <Icon color="fg.muted">
                      <LuCar />
                    </Icon>
                    <Text color="fg.muted" fontSize="sm">
                      На авто ученика: {pricing.studentCarPrice.toLocaleString()} ₽
                    </Text>
                  </HStack>
                )}
              </VStack>

              {pricing.workingAreas && pricing.workingAreas.length > 0 && (
                <HStack gap={2} flexWrap="wrap">
                  <Icon color="fg.muted">
                    <LuMapPin />
                  </Icon>
                  <Text>{pricing.workingAreas.map((area) => area.cityName).join(', ')}</Text>
                </HStack>
              )}
            </VStack>
          </Box>

          {/* Чеклист */}
          <Box>
            <Heading size="sm" mb={3}>
              Чеклист заполненности
            </Heading>
            <VStack align="stretch" gap={2}>
              {checklist.map((item) => (
                <HStack key={item.label} gap={2}>
                  <Icon color={item.filled ? 'green.solid' : 'fg.muted'}>
                    {item.filled ? <LuCheck /> : <item.icon />}
                  </Icon>
                  <Text color={item.filled ? 'fg' : 'fg.muted'}>{item.label}</Text>
                </HStack>
              ))}
            </VStack>
          </Box>

          {/* Советы */}
          <Box p={4} borderRadius="lg" bg="brand.subtle" borderWidth="1px" borderColor="brand.muted">
            <HStack gap={2} mb={3}>
              <Icon color="brand.solid">
                <LuLightbulb />
              </Icon>
              <Heading size="sm" color="brand.fg">
                Советы по привлечению учеников
              </Heading>
            </HStack>
            <List.Root gap={2} ps={6}>
              {tips.map((tip) => (
                <List.Item key={tip}>
                  <Text fontSize="sm" color="brand.fg">
                    {tip}
                  </Text>
                </List.Item>
              ))}
            </List.Root>
          </Box>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
