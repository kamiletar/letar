'use client'

import { Link } from '@/i18n/navigation'
import { Button, Container, Heading, Text, VStack } from '@chakra-ui/react'
import { useEffect } from 'react'

export default function CatalogError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Catalog error:', error)
  }, [error])

  return (
    <Container maxW="7xl" py={20}>
      <VStack gap={6} textAlign="center">
        <Heading size="xl">Ошибка загрузки каталога</Heading>
        <Text fontSize="lg" color="gray.600">
          Не удалось загрузить каталог товаров. Пожалуйста, попробуйте ещё раз.
        </Text>
        <VStack gap={3}>
          <Button onClick={reset} colorPalette="fg" size="lg">
            Обновить каталог
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link href="/">Вернуться на главную</Link>
          </Button>
        </VStack>
      </VStack>
    </Container>
  )
}
