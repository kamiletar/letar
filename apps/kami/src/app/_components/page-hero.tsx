import { Heading, Text, VStack } from '@chakra-ui/react'

interface PageHeroProps {
  /** Заголовок страницы */
  title: string
  /** Подзаголовок (отображается моноширинным шрифтом) */
  subtitle: string
  /** Описание/вступительный текст */
  description?: string
}

/**
 * Универсальный Hero-блок для страниц
 * Используется на About, Consulting и других страницах
 */
export function PageHero({ title, subtitle, description }: PageHeroProps) {
  return (
    <VStack gap={4} textAlign="center">
      <Heading as="h1" fontSize={{ base: '3xl', md: '5xl' }} fontWeight="bold">
        {title}
      </Heading>
      <Text fontSize={{ base: 'lg', md: 'xl' }} color="fg.500" fontFamily="mono">
        {subtitle}
      </Text>
      {description && (
        <Text fontSize={{ base: 'md', md: 'lg' }} color="fg.subtle" maxW="2xl">
          {description}
        </Text>
      )}
    </VStack>
  )
}
