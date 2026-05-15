'use client'

import { Box, Grid, Text } from '@chakra-ui/react'
import { MandalaCard } from './mandala-card'

/** Мандала с URL для отображения в сетке */
interface MandalaWithUrls {
  id: string
  slug: string
  name: string
  imageUrl: string
}

interface MandalaGridProps {
  mandalas: MandalaWithUrls[]
}

/**
 * Сетка мандал с анимированными карточками.
 * Использует MandalaCard для красивого отображения каждой мандалы.
 * Оптимизация: content-visibility: auto для ленивого рендеринга за пределами viewport
 */
export function MandalaGrid({ mandalas }: MandalaGridProps) {
  if (mandalas.length === 0) {
    return (
      <Box textAlign="center" py={10}>
        <Text fontSize="xl" color="fg.muted">
          Пока нет мандал
        </Text>
      </Box>
    )
  }

  return (
    <Grid
      templateColumns={{
        // minmax обеспечивает минимум 140px на карточку, автоматически переключаясь на 1 колонку на очень узких экранах
        base: 'repeat(auto-fit, minmax(140px, 1fr))',
        sm: 'repeat(2, 1fr)',
        md: 'repeat(3, 1fr)',
        lg: 'repeat(4, 1fr)',
        xl: 'repeat(5, 1fr)',
      }}
      gap={{ base: 3, sm: 4, md: 6 }}
      p={{ base: 3, sm: 4, md: 6 }}
    >
      {mandalas.map((mandala, index) => (
        <Box
          key={mandala.id}
          css={{
            // Нативная браузерная виртуализация — элементы за пределами viewport не рендерятся
            contentVisibility: 'auto',
            containIntrinsicSize: 'auto 300px', // Примерный размер для предотвращения layout shift
          }}
        >
          <MandalaCard mandala={mandala} index={index} />
        </Box>
      ))}
    </Grid>
  )
}
