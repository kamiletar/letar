import { Link } from '@/i18n/navigation'
import { Button, Container, Heading, Text, VStack } from '@chakra-ui/react'

export default function NotFound() {
  return (
    <Container maxW="xl" py={20}>
      <VStack gap={6} textAlign="center">
        <Heading size="3xl" color="gray.700">
          404
        </Heading>
        <Heading size="xl">Страница не найдена</Heading>
        <Text fontSize="lg" color="gray.600">
          К сожалению, запрашиваемая страница не существует или была перемещена.
        </Text>
        <VStack gap={3}>
          <Button asChild colorPalette="fg" size="lg">
            <Link href="/catalog">Перейти в каталог</Link>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link href="/">Вернуться на главную</Link>
          </Button>
        </VStack>
      </VStack>
    </Container>
  )
}
