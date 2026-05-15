'use client'
import { Box, Container, Heading, Icon, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { FaHeart, FaLeaf, FaStar } from 'react-icons/fa'

const features = [
  {
    icon: FaHeart,
    title: 'С Любовью',
    text: 'Каждое изделие создается с душой и вниманием к мельчайшим деталям, чтобы вы чувствовали заботу.',
  },
  {
    icon: FaStar,
    title: 'Премиум Качество',
    text: 'Используем только лучшие ткани и фурнитуру, гарантируя безупречный вид и долговечность.',
  },
  {
    icon: FaLeaf,
    title: 'Натуральность',
    text: 'Отдаем предпочтение натуральным материалам, которые приятны к телу и безопасны для здоровья.',
  },
]

export const BrandPhilosophy = () => {
  return (
    <Box py={{ base: 16, md: 24 }}>
      <Container maxW="7xl">
        <VStack gap={16}>
          <VStack gap={4} textAlign="center" maxW="3xl">
            <Heading as="h2" size="2xl">
              Философия Бренда
            </Heading>
            <Text fontSize="xl" color="fg.muted">
              Мы не просто шьем одежду, мы создаем настроение и подчеркиваем вашу уникальность. Премиум РосСтиль — это
              гармония стиля, качества и комфорта.
            </Text>
          </VStack>

          <SimpleGrid columns={{ base: 1, md: 3 }} gap={12} w="full">
            {features.map((feature) => (
              <VStack key={feature.title} gap={6} textAlign="center">
                <Box p={4} bg="bg.subtle" borderRadius="full" color="fg" fontSize="3xl">
                  <Icon as={feature.icon} />
                </Box>
                <Heading as="h3" size="lg">
                  {feature.title}
                </Heading>
                <Text color="fg.muted" fontSize="lg">
                  {feature.text}
                </Text>
              </VStack>
            ))}
          </SimpleGrid>
        </VStack>
      </Container>
    </Box>
  )
}
