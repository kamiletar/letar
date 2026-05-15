'use client'

import { Alert, Badge, Button, HStack, Text } from '@chakra-ui/react'
import Link from 'next/link'
import { useMemo } from 'react'
import { LuArrowRight, LuCar, LuImage, LuLightbulb, LuMapPin, LuUser } from 'react-icons/lu'

interface ProfileCtaData {
  /** Есть ли аватар */
  hasAvatar: boolean
  /** Есть ли биография */
  hasBio: boolean
  /** Есть ли автомобиль */
  hasVehicle: boolean
  /** Есть ли районы работы */
  hasWorkingAreas: boolean
}

interface CtaItem {
  key: string
  icon: React.ReactNode
  title: string
  impact: string
  href: string
  colorPalette: 'orange' | 'blue' | 'green' | 'purple'
}

/**
 * Компонент контекстного CTA для улучшения профиля инструктора.
 * Показывает одну рандомную рекомендацию из незаполненных полей.
 */
export function ProfileCta({ hasAvatar, hasBio, hasVehicle, hasWorkingAreas }: ProfileCtaData) {
  // Все возможные CTA
  const allCtas: CtaItem[] = useMemo(
    () => [
      {
        key: 'avatar',
        icon: <LuImage size={18} />,
        title: 'Добавьте аватар',
        impact: '+40% заявок',
        href: '/settings/profile',
        colorPalette: 'orange',
      },
      {
        key: 'bio',
        icon: <LuUser size={18} />,
        title: 'Расскажите о себе',
        impact: '+35% заявок',
        href: '/instructor-profile#bio',
        colorPalette: 'blue',
      },
      {
        key: 'vehicle',
        icon: <LuCar size={18} />,
        title: 'Укажите автомобиль',
        impact: 'Поиск по марке',
        href: '/vehicles',
        colorPalette: 'green',
      },
      {
        key: 'areas',
        icon: <LuMapPin size={18} />,
        title: 'Укажите районы работы',
        impact: 'Поиск по району',
        href: '/instructor-profile#working-areas',
        colorPalette: 'purple',
      },
    ],
    []
  )

  // Фильтруем только незаполненные поля
  const missingCtas = useMemo(() => {
    const missing: CtaItem[] = []
    if (!hasAvatar) {
      missing.push(allCtas[0])
    }
    if (!hasBio) {
      missing.push(allCtas[1])
    }
    if (!hasVehicle) {
      missing.push(allCtas[2])
    }
    if (!hasWorkingAreas) {
      missing.push(allCtas[3])
    }
    return missing
  }, [hasAvatar, hasBio, hasVehicle, hasWorkingAreas, allCtas])

  // Выбираем случайный CTA (стабильный на SSR)
  const randomCta = useMemo(() => {
    if (missingCtas.length === 0) {
      return null
    }
    // Используем индекс на основе длины массива для псевдослучайности
    const index = Math.floor(Date.now() / 60000) % missingCtas.length
    return missingCtas[index]
  }, [missingCtas])

  // Если всё заполнено — ничего не показываем
  if (!randomCta) {
    return null
  }

  return (
    <Alert.Root status="info" variant="subtle" borderRadius="lg" colorPalette={randomCta.colorPalette}>
      <Alert.Indicator>{randomCta.icon}</Alert.Indicator>
      <Alert.Content flex={1}>
        <HStack justify="space-between" flexWrap="wrap" gap={2}>
          <HStack gap={2} flexWrap="wrap">
            <LuLightbulb size={14} />
            <Text fontWeight="medium" fontSize="sm">
              {randomCta.title}
            </Text>
            <Badge colorPalette="green" size="sm">
              {randomCta.impact}
            </Badge>
          </HStack>
          <Button asChild size="xs" variant="solid" colorPalette={randomCta.colorPalette}>
            <Link href={randomCta.href}>
              Заполнить
              <LuArrowRight size={14} />
            </Link>
          </Button>
        </HStack>
      </Alert.Content>
    </Alert.Root>
  )
}
