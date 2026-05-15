'use client'

import { Box, Card, HStack, Skeleton, VStack } from '@chakra-ui/react'

/**
 * Skeleton loading для фильтров
 *
 * Отображается пока данные (жанры, студии, fandubbers) загружаются
 */
export function FiltersSkeleton() {
  return (
    <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
      <Card.Body>
        <VStack gap={4} align="stretch">
          {/* Поиск и сортировка */}
          <HStack gap={3}>
            <Skeleton height="44px" flex={1} borderRadius="md" />
            <Skeleton height="44px" width="200px" borderRadius="md" hideBelow="md" />
          </HStack>

          {/* Desktop фильтры */}
          <Box hideBelow="md">
            <HStack gap={3} wrap="wrap">
              <Skeleton height="20px" width="60px" borderRadius="md" />

              {/* 5 фильтров */}
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} height="44px" width="140px" borderRadius="md" />
              ))}

              {/* Кнопка "Ещё" */}
              <Skeleton height="44px" width="80px" borderRadius="md" />
            </HStack>
          </Box>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
