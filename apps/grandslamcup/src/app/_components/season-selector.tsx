/**
 * Выбор сезона — переиспользуемый компонент для standings, schedule и др.
 */

import { Box } from '@chakra-ui/react'
import Link from 'next/link'

interface Season {
  id: string
  name: string
  slug: string
}

interface SeasonSelectorProps {
  /** Список сезонов */
  seasons: Season[]
  /** ID текущего выбранного сезона */
  currentId: string
  /** Базовый путь для ссылок (например '/standings') */
  basePath: string
}

export function SeasonSelector({ seasons, currentId, basePath }: SeasonSelectorProps) {
  return (
    <Box display="flex" gap={2} flexWrap="wrap">
      {seasons.map((s) => (
        <Link key={s.id} href={`${basePath}?season=${s.slug}`}>
          <Box
            px={3}
            py={1.5}
            borderRadius="md"
            fontSize="sm"
            fontWeight={s.id === currentId ? 'semibold' : 'normal'}
            bg={s.id === currentId ? 'brand.solid' : 'bg.subtle'}
            color={s.id === currentId ? 'brand.contrast' : 'fg'}
            _hover={{ opacity: 0.8 }}
            transition="all 0.15s"
          >
            {s.name}
          </Box>
        </Link>
      ))}
    </Box>
  )
}
