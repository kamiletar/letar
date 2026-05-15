'use client'

/**
 * Обёртка вкладок для страницы аниме
 *
 * Эпизоды, О сериале, Связанные, Франшиза, Видео — условные вкладки.
 * Адаптация из animatrona-web AnimeDetailTabs.
 */

import { Badge, HStack, Tabs, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'

interface TabItem {
  value: string
  label: string
  badge?: number
  content: ReactNode
}

interface AnimeDetailTabsProps {
  episodeCount: number
  commentCount?: number
  sections: {
    episodes: ReactNode
    about: ReactNode
    related?: ReactNode
    franchise?: ReactNode
    similar?: ReactNode
    videos?: ReactNode
    comments?: ReactNode
  }
}

export function AnimeDetailTabs({ episodeCount, commentCount, sections }: AnimeDetailTabsProps) {
  const tabs: TabItem[] = [
    { value: 'episodes', label: 'Эпизоды', badge: episodeCount, content: sections.episodes },
    { value: 'about', label: 'О сериале', content: sections.about },
  ]

  if (sections.related) {
    tabs.push({ value: 'related', label: 'Связанные', content: sections.related })
  }
  if (sections.franchise) {
    tabs.push({ value: 'franchise', label: 'Франшиза', content: sections.franchise })
  }
  if (sections.similar) {
    tabs.push({ value: 'similar', label: 'Похожие', content: sections.similar })
  }
  if (sections.videos) {
    tabs.push({ value: 'videos', label: 'Видео', content: sections.videos })
  }
  if (sections.comments) {
    tabs.push({ value: 'comments', label: 'Комментарии', badge: commentCount, content: sections.comments })
  }

  return (
    <Tabs.Root defaultValue="episodes" lazyMount unmountOnExit={false}>
      <Tabs.List
        borderBottom="1px"
        borderColor="border.subtle"
        mb={4}
        overflowX="auto"
        css={{ '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none' }}
      >
        {tabs.map((tab) => (
          <Tabs.Trigger key={tab.value} value={tab.value} px={{ base: 2, md: 4 }} py={2} whiteSpace="nowrap">
            <HStack gap={2}>
              <Text>{tab.label}</Text>
              {tab.badge !== null && (
                <Badge colorPalette="purple" size="sm" variant="subtle">
                  {tab.badge}
                </Badge>
              )}
            </HStack>
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      {tabs.map((tab) => (
        <Tabs.Content key={tab.value} value={tab.value} pt={2}>
          {tab.content}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  )
}
