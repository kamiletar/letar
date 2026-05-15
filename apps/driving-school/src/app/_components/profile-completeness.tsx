'use client'

import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Collapsible,
  Heading,
  HStack,
  List,
  Progress,
  Text,
  VStack,
} from '@chakra-ui/react'
import Link from 'next/link'
import { useState } from 'react'
import {
  LuCalendar,
  LuCar,
  LuCheck,
  LuChevronDown,
  LuChevronUp,
  LuCircleAlert,
  LuDollarSign,
  LuImage,
  LuMapPin,
  LuPartyPopper,
  LuUser,
} from 'react-icons/lu'

interface ProfileField {
  key: string
  label: string
  icon: React.ReactNode
  filled: boolean
  description: string
  impact?: string
  href?: string
}

interface ProfileCompletenessProps {
  /** Профиль инструктора */
  profile: {
    bio?: string | null
    experienceStartDate?: Date | null
    licenseCategories?: string[]
    workingAreas?: unknown
    basePrice?: number | null
    photoId?: string | null
  } | null
  /** Расписание */
  scheduleSettings: {
    lessonDuration?: number | null
  } | null
  /** Автомобили */
  vehicles: Array<{
    brand?: string | null
    model?: string | null
  }>
  /** Аватар пользователя */
  userImage?: string | null
}

/**
 * Компонент прогресс-бара заполненности профиля инструктора.
 * Показывает процент заполненности и советы по улучшению.
 */
export function ProfileCompleteness({ profile, scheduleSettings, vehicles, userImage }: ProfileCompletenessProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Определяем поля для проверки
  const fields: ProfileField[] = [
    {
      key: 'avatar',
      label: 'Аватар',
      icon: <LuImage size={16} />,
      filled: !!userImage,
      description: 'Добавьте аватар — профили с фото получают на 40% больше заявок',
      impact: '+40% заявок',
      href: '/settings/profile',
    },
    {
      key: 'instructorPhoto',
      label: 'Фото инструктора',
      icon: <LuImage size={16} />,
      filled: !!profile?.photoId,
      description: 'Добавьте фото для страницы профиля',
      href: '/instructor-profile',
    },
    {
      key: 'bio',
      label: 'О себе',
      icon: <LuUser size={16} />,
      filled: !!profile?.bio && profile.bio.trim().length > 0,
      description: 'Расскажите о себе — это помогает ученикам сделать выбор',
      impact: '+35% заявок',
      href: '/instructor-profile#bio',
    },
    {
      key: 'experience',
      label: 'Стаж работы',
      icon: <LuCalendar size={16} />,
      filled: !!profile?.experienceStartDate,
      description: 'Укажите дату начала работы инструктором',
      href: '/instructor-profile',
    },
    {
      key: 'categories',
      label: 'Категории прав',
      icon: <LuCheck size={16} />,
      filled: !!profile?.licenseCategories && profile.licenseCategories.length > 0,
      description: 'Укажите категории прав, по которым обучаете',
      href: '/instructor-profile',
    },
    {
      key: 'vehicle',
      label: 'Автомобиль',
      icon: <LuCar size={16} />,
      filled: vehicles.length > 0 && !!vehicles[0]?.brand && !!vehicles[0]?.model,
      description: 'Добавьте автомобиль — ученики часто ищут по марке',
      impact: 'Поиск по авто',
      href: '/vehicles',
    },
    {
      key: 'schedule',
      label: 'Расписание',
      icon: <LuCalendar size={16} />,
      filled: !!scheduleSettings?.lessonDuration,
      description: 'Настройте расписание для записи учеников',
      href: '/schedule',
    },
    {
      key: 'price',
      label: 'Цена занятия',
      icon: <LuDollarSign size={16} />,
      filled: !!profile?.basePrice && profile.basePrice > 0,
      description: 'Укажите стоимость занятия',
      href: '/instructor-profile',
    },
    {
      key: 'areas',
      label: 'Районы работы',
      icon: <LuMapPin size={16} />,
      filled: !!profile?.workingAreas && Array.isArray(profile.workingAreas) && profile.workingAreas.length > 0,
      description: 'Укажите районы — ученики ищут инструктора рядом',
      impact: 'Поиск по району',
      href: '/instructor-profile',
    },
  ]

  const filledCount = fields.filter((f) => f.filled).length
  const totalCount = fields.length
  const percentage = Math.round((filledCount / totalCount) * 100)

  const missingFields = fields.filter((f) => !f.filled)
  const isComplete = percentage === 100

  // Цвет прогресс-бара
  const getColorPalette = () => {
    if (percentage < 40) {
      return 'red'
    }
    if (percentage < 70) {
      return 'orange'
    }
    if (percentage < 100) {
      return 'yellow'
    }
    return 'green'
  }

  // Если профиль полный — показываем поздравление
  if (isComplete) {
    return (
      <Alert.Root status="success" variant="subtle" borderRadius="lg">
        <Alert.Indicator>
          <LuPartyPopper size={20} />
        </Alert.Indicator>
        <Alert.Content>
          <Alert.Title>Профиль заполнен на 100%!</Alert.Title>
          <Alert.Description>
            Отлично! Ваш профиль полностью заполнен. Ученики смогут легко найти вас.
          </Alert.Description>
        </Alert.Content>
      </Alert.Root>
    )
  }

  return (
    <Card.Root variant="outline" borderColor={percentage < 50 ? 'orange.muted' : 'border'}>
      <Card.Body py={4}>
        <VStack gap={4} align="stretch">
          {/* Заголовок и прогресс */}
          <HStack justify="space-between" flexWrap="wrap" gap={2}>
            <HStack gap={2}>
              <LuCircleAlert size={18} color="var(--chakra-colors-orange-fg)" />
              <Heading size="sm">Заполненность профиля</Heading>
              <Badge colorPalette={getColorPalette()} size="lg">
                {percentage}%
              </Badge>
            </HStack>
            <Text fontSize="sm" color="fg.muted">
              {filledCount} из {totalCount} полей
            </Text>
          </HStack>

          {/* Прогресс-бар */}
          <Progress.Root value={percentage} colorPalette={getColorPalette()}>
            <Progress.Track>
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>

          {/* Раскрываемый список рекомендаций */}
          <Collapsible.Root open={isExpanded} onOpenChange={(e) => setIsExpanded(e.open)}>
            <Collapsible.Trigger asChild>
              <Button variant="ghost" size="sm" w="full" justifyContent="space-between">
                <Text>{isExpanded ? 'Скрыть рекомендации' : `Показать что заполнить (${missingFields.length})`}</Text>
                {isExpanded ? <LuChevronUp size={16} /> : <LuChevronDown size={16} />}
              </Button>
            </Collapsible.Trigger>

            <Collapsible.Content>
              <Box mt={3} pt={3} borderTopWidth="1px" borderColor="border">
                <List.Root gap={2} variant="plain">
                  {missingFields.map((field) => (
                    <List.Item key={field.key}>
                      <HStack
                        justify="space-between"
                        align="start"
                        p={2}
                        borderRadius="md"
                        _hover={{ bg: 'bg.subtle' }}
                        flexWrap="wrap"
                        gap={2}
                      >
                        <HStack gap={2} flex={1}>
                          <Box color="orange.fg">{field.icon}</Box>
                          <Box>
                            <Text fontWeight="medium" fontSize="sm">
                              {field.label}
                            </Text>
                            <Text fontSize="xs" color="fg.muted">
                              {field.description}
                            </Text>
                          </Box>
                        </HStack>
                        <HStack gap={2}>
                          {field.impact && (
                            <Badge colorPalette="green" size="sm">
                              {field.impact}
                            </Badge>
                          )}
                          {field.href && (
                            <Button asChild size="xs" variant="outline">
                              <Link href={field.href}>Заполнить</Link>
                            </Button>
                          )}
                        </HStack>
                      </HStack>
                    </List.Item>
                  ))}
                </List.Root>
              </Box>
            </Collapsible.Content>
          </Collapsible.Root>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
