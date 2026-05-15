/**
 * Social Proof Badges
 *
 * Отображает доверительные бейджи на карточках инструкторов:
 * - Топ рейтинг (4.8+)
 * - Много отзывов (10+)
 * - Опытный (5+ лет)
 * - Проверенный профиль
 *
 * @module social-proof-badges
 */

import { Badge, HStack, Icon, type StackProps } from '@chakra-ui/react'
import { LuBadgeCheck, LuFlame, LuShield, LuStar } from 'react-icons/lu'

export interface SocialProofBadgesProps extends StackProps {
  /** Средний рейтинг инструктора */
  averageRating?: number | null
  /** Количество отзывов */
  reviewCount?: number
  /** Дата начала работы (для расчёта стажа) */
  experienceStartDate?: Date | null
  /** Профиль опубликован и проверен */
  isVerified?: boolean
  /** Количество активных учеников */
  activeStudentsCount?: number
}

/**
 * Компонент отображения social proof бейджей
 */
export function SocialProofBadges({
  averageRating,
  reviewCount = 0,
  experienceStartDate,
  isVerified = false,
  activeStudentsCount,
  ...stackProps
}: SocialProofBadgesProps) {
  const badges: Array<{
    key: string
    label: string
    icon: React.ElementType
    colorPalette: string
  }> = []

  // Топ рейтинг (4.8+)
  if (averageRating && averageRating >= 4.8) {
    badges.push({
      key: 'top-rating',
      label: 'Топ рейтинг',
      icon: LuStar,
      colorPalette: 'yellow',
    })
  }

  // Много отзывов (10+)
  if (reviewCount >= 10) {
    badges.push({
      key: 'popular',
      label: 'Популярный',
      icon: LuFlame,
      colorPalette: 'orange',
    })
  }

  // Опытный (5+ лет)
  if (experienceStartDate) {
    const yearsOfExperience = Math.floor(
      (Date.now() - new Date(experienceStartDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    )
    if (yearsOfExperience >= 5) {
      badges.push({
        key: 'experienced',
        label: 'Опытный',
        icon: LuShield,
        colorPalette: 'purple',
      })
    }
  }

  // Проверенный профиль
  if (isVerified) {
    badges.push({
      key: 'verified',
      label: 'Проверенный',
      icon: LuBadgeCheck,
      colorPalette: 'green',
    })
  }

  // Много учеников (5+)
  if (activeStudentsCount && activeStudentsCount >= 5) {
    badges.push({
      key: 'many-students',
      label: `${activeStudentsCount} учеников`,
      icon: LuFlame,
      colorPalette: 'blue',
    })
  }

  if (badges.length === 0) {
    return null
  }

  return (
    <HStack gap={1.5} flexWrap="wrap" {...stackProps}>
      {badges.slice(0, 3).map((badge) => (
        <Badge
          key={badge.key}
          colorPalette={badge.colorPalette}
          variant="subtle"
          size="sm"
          display="flex"
          alignItems="center"
          gap={1}
        >
          <Icon boxSize={3}>
            <badge.icon />
          </Icon>
          {badge.label}
        </Badge>
      ))}
    </HStack>
  )
}
