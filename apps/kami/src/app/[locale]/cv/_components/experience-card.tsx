import { Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { memo } from 'react'

interface ExperienceCardProps {
  /** Период работы */
  period: string
  /** Название компании */
  company: string
  /** Должность */
  position: string
  /** Описание */
  description: string
  /** Достижения */
  achievements: string[]
}

/**
 * Карточка опыта работы для CV
 */
export const ExperienceCard = memo(function ExperienceCard({
  period,
  company,
  position,
  description,
  achievements,
}: ExperienceCardProps) {
  return (
    <VStack
      gap={4}
      p={{ base: 5, md: 6 }}
      borderRadius="xl"
      bg={{ base: 'gray.50', _dark: 'gray.900' }}
      border="1px solid"
      borderColor={{ base: 'gray.200', _dark: 'gray.700' }}
      align="stretch"
    >
      <HStack justify="space-between" flexWrap="wrap" gap={2}>
        <VStack align="start" gap={0}>
          <Heading as="h3" fontSize="lg">
            {company}
          </Heading>
          <Text color="fg.500" fontFamily="mono" fontSize="sm">
            {position}
          </Text>
        </VStack>
        <Text
          color="fg.muted"
          fontSize="sm"
          px={3}
          py={1}
          bg={{ base: 'gray.200', _dark: 'gray.800' }}
          borderRadius="full"
        >
          {period}
        </Text>
      </HStack>

      <Text color="fg.muted" fontSize="sm">
        {description}
      </Text>

      <VStack as="ul" align="stretch" gap={1} pl={4}>
        {achievements.map((achievement, index) => (
          <Text as="li" key={index} fontSize="sm" listStyleType="disc">
            {achievement}
          </Text>
        ))}
      </VStack>
    </VStack>
  )
})
