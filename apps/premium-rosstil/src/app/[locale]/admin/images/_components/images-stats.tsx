'use client'

import { Box, Card, Heading, HStack, Icon, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { FiAlertCircle, FiDatabase, FiImage, FiUser } from 'react-icons/fi'
import type { ImagesStats } from '../_actions/get-images'

interface ImagesStatsCardProps {
  stats: ImagesStats
}

/**
 * Форматирование размера файла.
 */
function formatSize(bytes: number): string {
  if (bytes === 0) {
    return '0 Б'
  }

  const sizes = ['Б', 'КБ', 'МБ', 'ГБ']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))

  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

/**
 * Получить иконку для категории.
 */
function getCategoryIcon(category: string) {
  switch (category) {
    case 'PRODUCT':
      return FiImage
    case 'AVATAR':
      return FiUser
    case 'REFERENCE':
      return FiDatabase
    case 'NOTIFICATION':
      return FiAlertCircle
    default:
      return FiImage
  }
}

/**
 * Получить название категории на русском.
 */
function getCategoryLabel(category: string): string {
  switch (category) {
    case 'PRODUCT':
      return 'Товары'
    case 'AVATAR':
      return 'Аватары'
    case 'REFERENCE':
      return 'Ориентиры'
    case 'NOTIFICATION':
      return 'Уведомления'
    default:
      return category
  }
}

/**
 * Получить цвет категории.
 */
function getCategoryColor(category: string): string {
  switch (category) {
    case 'PRODUCT':
      return 'green.500'
    case 'AVATAR':
      return 'blue.500'
    case 'REFERENCE':
      return 'purple.500'
    case 'NOTIFICATION':
      return 'orange.500'
    default:
      return 'gray.500'
  }
}

export function ImagesStatsCard({ stats }: ImagesStatsCardProps) {
  const categories = Object.entries(stats.byCategory).filter(([_, data]) => data.count > 0)

  return (
    <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={4}>
      {/* Общая статистика */}
      <Card.Root>
        <Card.Body>
          <HStack gap={4}>
            <Box p={3} bg="fg.muted/10" borderRadius="lg" color="fg">
              <Icon boxSize={6}>
                <FiImage />
              </Icon>
            </Box>
            <VStack align="start" gap={0}>
              <Text fontSize="sm" color="fg.muted">
                Всего изображений
              </Text>
              <Heading size="xl">{stats.total}</Heading>
              <Text fontSize="xs" color="fg.muted">
                {formatSize(stats.totalSize)}
              </Text>
            </VStack>
          </HStack>
        </Card.Body>
      </Card.Root>

      {/* По категориям */}
      {categories.map(([category, data]) => (
        <Card.Root key={category}>
          <Card.Body>
            <HStack gap={4}>
              <Box p={3} bg={`${getCategoryColor(category)}10`} borderRadius="lg" color={getCategoryColor(category)}>
                <Icon boxSize={6}>
                  {(() => {
                    const IconComponent = getCategoryIcon(category)
                    return <IconComponent />
                  })()}
                </Icon>
              </Box>
              <VStack align="start" gap={0}>
                <Text fontSize="sm" color="fg.muted">
                  {getCategoryLabel(category)}
                </Text>
                <Heading size="xl">{data.count}</Heading>
                <Text fontSize="xs" color="fg.muted">
                  {formatSize(data.size)}
                </Text>
              </VStack>
            </HStack>
          </Card.Body>
        </Card.Root>
      ))}

      {/* Неиспользуемые */}
      {stats.unused > 0 && (
        <Card.Root borderColor="red.200">
          <Card.Body>
            <HStack gap={4}>
              <Box p={3} bg="red.50" borderRadius="lg" color="red.500">
                <Icon boxSize={6}>
                  <FiAlertCircle />
                </Icon>
              </Box>
              <VStack align="start" gap={0}>
                <Text fontSize="sm" color="fg.muted">
                  Неиспользуемые
                </Text>
                <Heading size="xl" color="red.500">
                  {stats.unused}
                </Heading>
                <Text fontSize="xs" color="red.500">
                  Можно удалить
                </Text>
              </VStack>
            </HStack>
          </Card.Body>
        </Card.Root>
      )}
    </SimpleGrid>
  )
}
