'use client'

/**
 * Табы для страницы аниме
 *
 * - Эпизоды (default) — сразу после hero
 * - О сериале — описание + метаданные
 * - Связанные — RelatedAnimeList
 * - Франшиза — интерактивный граф (если есть shikimoriId)
 * - Видео — опенинги, эндинги, трейлеры (если есть)
 */

import { Badge, Box, Tabs } from '@chakra-ui/react'
import { type ReactNode } from 'react'

export interface AnimeDetailTabsProps {
  /** Количество эпизодов для badge */
  episodeCount: number
  /** Есть ли видео */
  hasVideos: boolean
  /** Показывать таб франшизы (требует shikimoriId) */
  hasFranchise?: boolean
  /** Показывать таб дорожек */
  hasTracks?: boolean
  /** Показывать таб "Связанные" (default true) */
  hasRelated?: boolean
  /** Текущая вкладка (контролируемый режим) */
  value?: string
  /** Колбэк при смене вкладки */
  onValueChange?: (value: string) => void
  /** Контент табов */
  children: {
    episodes: ReactNode
    about: ReactNode
    related?: ReactNode
    franchise?: ReactNode
    videos?: ReactNode
    tracks?: ReactNode
  }
}

export function AnimeDetailTabs({
  episodeCount,
  hasVideos,
  hasFranchise,
  hasTracks,
  hasRelated = true,
  value,
  onValueChange,
  children,
}: AnimeDetailTabsProps) {
  // Контролируемый режим (value + onValueChange) или неконтролируемый (defaultValue)
  const tabsProps = value != null
    ? { value, onValueChange: (details: { value: string }) => onValueChange?.(details.value) }
    : { defaultValue: 'episodes' as const }

  return (
    <Tabs.Root {...tabsProps} lazyMount unmountOnExit={false}>
      <Tabs.List mb={4}>
        <Tabs.Trigger value="episodes">
          Эпизоды
          <Badge ml={2} size="sm" colorPalette="purple" variant="subtle">
            {episodeCount}
          </Badge>
        </Tabs.Trigger>
        <Tabs.Trigger value="about">О сериале</Tabs.Trigger>
        {hasTracks && <Tabs.Trigger value="tracks">Дорожки</Tabs.Trigger>}
        {hasRelated && <Tabs.Trigger value="related">Связанные</Tabs.Trigger>}
        {hasFranchise && <Tabs.Trigger value="franchise">Франшиза</Tabs.Trigger>}
        {hasVideos && <Tabs.Trigger value="videos">Видео</Tabs.Trigger>}
      </Tabs.List>

      <Box>
        <Tabs.Content value="episodes">{children.episodes}</Tabs.Content>

        <Tabs.Content value="about">{children.about}</Tabs.Content>

        {hasTracks && <Tabs.Content value="tracks">{children.tracks}</Tabs.Content>}

        {hasRelated && <Tabs.Content value="related">{children.related}</Tabs.Content>}

        {hasFranchise && <Tabs.Content value="franchise">{children.franchise}</Tabs.Content>}

        {hasVideos && <Tabs.Content value="videos">{children.videos}</Tabs.Content>}
      </Box>
    </Tabs.Root>
  )
}
