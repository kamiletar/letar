import { Box, Button, Container, Heading, HStack, Stack, Text } from '@chakra-ui/react'
import { CheckCircle } from 'lucide-react'
import Link from 'next/link'

export function CTASection() {
  return (
    <Box
      py={{ base: 16, md: 20 }}
      bgGradient="to-br"
      gradientFrom="brand.600"
      gradientTo="brand.800"
      position="relative"
      overflow="hidden"
    >
      {/* Декоративный градиент */}
      <Box
        position="absolute"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        width="150%"
        height="150%"
        bgGradient="radial(circle at center, rgba(255, 255, 255, 0.1) 0%, transparent 50%)"
        pointerEvents="none"
      />

      <Container maxW="container.md" position="relative" textAlign="center">
        <Stack gap={6} align="center">
          <Heading size={{ base: 'xl', md: '2xl' }} color="white">
            Готовы начать обучение?
          </Heading>

          <Text fontSize="lg" color="whiteAlpha.800" maxW="lg">
            Присоединяйтесь к тысячам инструкторов и учеников, которые уже используют нашу платформу
          </Text>

          <Button asChild size="lg" bg="white" color="brand.700" _hover={{ bg: 'whiteAlpha.900' }}>
            <Link href="/sign-up">Зарегистрироваться бесплатно</Link>
          </Button>

          <HStack gap={6} flexWrap="wrap" justify="center" color="whiteAlpha.800" fontSize="sm">
            <HStack gap={1}>
              <CheckCircle size={16} />
              <Text>Бесплатная регистрация</Text>
            </HStack>
            <HStack gap={1}>
              <CheckCircle size={16} />
              <Text>Настройка за 5 минут</Text>
            </HStack>
            <HStack gap={1}>
              <CheckCircle size={16} />
              <Text>Без кредитной карты</Text>
            </HStack>
          </HStack>
        </Stack>
      </Container>
    </Box>
  )
}
