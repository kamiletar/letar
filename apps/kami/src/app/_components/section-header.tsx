import { Heading, Text, VStack } from '@chakra-ui/react'

interface SectionHeaderProps {
  /** Заголовок секции */
  title: string
  /** Подзаголовок секции */
  subtitle?: string
}

/**
 * Универсальный заголовок секции
 * Используется в списках, коллекциях и других секциях
 */
export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <VStack gap={2} textAlign="center">
      <Heading as="h2" fontSize={{ base: '2xl', md: '3xl' }}>
        {title}
      </Heading>
      {subtitle && (
        <Text color="gray.500" maxW="2xl" mx="auto">
          {subtitle}
        </Text>
      )}
    </VStack>
  )
}
