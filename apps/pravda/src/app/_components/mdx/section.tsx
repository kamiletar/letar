import { Box, Heading } from '@chakra-ui/react'
import type { ReactNode } from 'react'

import { HEADER_HEIGHT, SCROLL_MARGIN_TOP } from '@/lib/constants'

interface SectionProps {
  /** ID раздела для якоря (например: "1", "2") */
  id: string
  /** Заголовок раздела (например: "РАЗДЕЛ I. ОБЩИЕ ПОЛОЖЕНИЯ") */
  title: string
  /** Содержимое раздела (главы и статьи) */
  children: ReactNode
}

/**
 * Компонент раздела закона.
 * Крупный заголовок с градиентной линией и sticky эффектом.
 * Server Component — нет хуков.
 */
export function Section({ id, title, children }: SectionProps) {
  const anchorId = `section-${id}`

  return (
    <Box as="section" id={anchorId} mt={10} mb={6} scrollMarginTop={SCROLL_MARGIN_TOP}>
      {/* Заголовок раздела с sticky эффектом */}
      <Box
        position="sticky"
        top={HEADER_HEIGHT}
        zIndex="docked"
        bg="bg"
        mb={4}
        pb={2}
        pt={2}
        mt={-2}
        borderBottomWidth="2px"
        borderBottomStyle="solid"
        borderImage="linear-gradient(to right, var(--chakra-colors-brand-500), var(--chakra-colors-accent-500), var(--chakra-colors-brand-500)) 1"
      >
        <Heading as="h2" size="lg" textTransform="uppercase" color="fg.default">
          {title}
        </Heading>
      </Box>
      {children}
    </Box>
  )
}
