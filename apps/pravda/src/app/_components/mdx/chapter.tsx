import { Badge, Box, Heading, HStack } from '@chakra-ui/react'
import type { ReactNode } from 'react'

import { SCROLL_MARGIN_TOP } from '@/lib/constants'

interface ChapterProps {
  /** Номер главы (например: 1, "3а", "3б") */
  number: number | string
  /** Заголовок главы */
  title: string
  /** Содержимое главы (статьи) */
  children: ReactNode
}

/**
 * Компонент главы закона.
 * Заголовок с номером в бейдже и вертикальной линией для иерархии.
 * Server Component — нет хуков.
 */
export function Chapter({ number, title, children }: ChapterProps) {
  const id = `chapter-${number}`

  return (
    <Box
      as="section"
      id={id}
      mt={6}
      mb={4}
      ml={{
        base: 1,
        md: 4,
      }}
      pl={{
        base: 1,
        md: 4,
      }}
      borderLeftWidth="2px"
      borderLeftColor="accent.400"
      scrollMarginTop={SCROLL_MARGIN_TOP}
      _dark={{ borderLeftColor: 'accent.600' }}
    >
      <HStack mb={3} gap={2}>
        <Badge colorPalette="orange" size="lg" px={2} py={1} borderRadius="md">
          Глава {number}
        </Badge>
        <Heading as="h3" size="md" color="fg.default">
          {title}
        </Heading>
      </HStack>
      {children}
    </Box>
  )
}
