import { Button, Container, Heading, Link, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'

/**
 * Страница 403 — Доступ запрещён
 * Показывается при попытке доступа к защищённым ресурсам без прав
 */
export default function ForbiddenPage() {
  return (
    <Container maxW="md" py={20}>
      <VStack gap={6} textAlign="center">
        <Heading size="4xl" color="red.500">
          403
        </Heading>
        <Heading size="lg">Доступ запрещён</Heading>
        <Text color="fg.muted">У вас нет прав для просмотра этой страницы</Text>
        <Link asChild>
          <NextLink href="/">
            <Button colorPalette="brand">На главную</Button>
          </NextLink>
        </Link>
      </VStack>
    </Container>
  )
}
