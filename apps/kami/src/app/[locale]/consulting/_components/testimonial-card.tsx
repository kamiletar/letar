'use client'

import { Avatar, Box, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { Star } from 'lucide-react'
import { memo } from 'react'

interface TestimonialCardProps {
  authorName: string
  authorRole?: string | null
  authorCompany?: string | null
  authorAvatar?: string | null
  content: string
  rating: number
}

/**
 * Карточка отзыва клиента
 */
export const TestimonialCard = memo(function TestimonialCard({
  authorName,
  authorRole,
  authorCompany,
  authorAvatar,
  content,
  rating,
}: TestimonialCardProps) {
  return (
    <Box
      p={6}
      borderRadius="xl"
      bg={{ base: 'white', _dark: 'gray.900' }}
      border="1px solid"
      borderColor={{ base: 'gray.200', _dark: 'gray.700' }}
      _hover={{
        borderColor: 'purple.500',
        transform: 'translateY(-4px)',
        boxShadow: 'lg',
      }}
      transition="all 0.3s"
    >
      <VStack align="stretch" gap={4}>
        {/* Рейтинг */}
        <HStack gap={1}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Icon key={`star-${i}`} asChild boxSize={4} color={i < rating ? 'yellow.400' : 'gray.300'}>
              <Star fill={i < rating ? 'currentColor' : 'none'} />
            </Icon>
          ))}
        </HStack>

        {/* Текст отзыва */}
        <Text color="gray.600" _dark={{ color: 'gray.300' }} lineHeight="tall">
          "{content}"
        </Text>

        {/* Автор */}
        <HStack gap={3} pt={2}>
          <Avatar.Root size="sm">
            {authorAvatar
              ? <Avatar.Image src={authorAvatar} alt={authorName} />
              : <Avatar.Fallback>{authorName.slice(0, 2).toUpperCase()}</Avatar.Fallback>}
          </Avatar.Root>
          <VStack align="start" gap={0}>
            <Text fontWeight="semibold" fontSize="sm">
              {authorName}
            </Text>
            {(authorRole || authorCompany) && (
              <Text fontSize="xs" color="gray.500">
                {[authorRole, authorCompany].filter(Boolean).join(' · ')}
              </Text>
            )}
          </VStack>
        </HStack>
      </VStack>
    </Box>
  )
})
