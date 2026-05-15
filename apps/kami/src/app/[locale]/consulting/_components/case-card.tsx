'use client'

import { OptimizedImage } from '@/app/_components/ui/optimized-image'
import { Badge, Box, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { memo } from 'react'

interface CaseCardProps {
  title: string
  excerpt: string
  coverImage?: string | null
  industry?: string | null
  techStack?: string[]
  year?: number | null
}

/**
 * Карточка кейса консалтинга
 */
export const CaseCard = memo(function CaseCard({
  title,
  excerpt,
  coverImage,
  industry,
  techStack = [],
  year,
}: CaseCardProps) {
  return (
    <Box
      borderRadius="xl"
      overflow="hidden"
      bg={{ base: 'white', _dark: 'gray.900' }}
      border="1px solid"
      borderColor={{ base: 'gray.200', _dark: 'gray.700' }}
      _hover={{
        borderColor: 'purple.500',
        transform: 'translateY(-4px)',
        boxShadow: 'xl',
      }}
      transition="all 0.3s"
    >
      {/* Обложка */}
      {coverImage && (
        <Box position="relative" height="180px">
          <OptimizedImage src={coverImage} alt={title} height="100%" width="100%" />
          {year && (
            <Badge position="absolute" top={3} right={3} colorPalette="purple" variant="solid" zIndex={1}>
              {year}
            </Badge>
          )}
        </Box>
      )}

      {/* Контент */}
      <VStack align="stretch" gap={3} p={5}>
        {/* Индустрия */}
        {industry && (
          <Badge colorPalette="gray" variant="subtle" alignSelf="start">
            {industry}
          </Badge>
        )}

        {/* Заголовок */}
        <Heading as="h3" size="md" lineHeight="short">
          {title}
        </Heading>

        {/* Описание */}
        <Text fontSize="sm" color="gray.500" lineClamp={3}>
          {excerpt}
        </Text>

        {/* Технологии */}
        {techStack.length > 0 && (
          <HStack gap={2} flexWrap="wrap">
            {techStack.slice(0, 4).map((tech) => (
              <Badge key={tech} variant="outline" colorPalette="purple" fontSize="xs">
                {tech}
              </Badge>
            ))}
            {techStack.length > 4 && (
              <Text fontSize="xs" color="gray.500">
                +{techStack.length - 4}
              </Text>
            )}
          </HStack>
        )}
      </VStack>
    </Box>
  )
})
