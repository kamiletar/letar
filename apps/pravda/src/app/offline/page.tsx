'use client'

import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'
import { LuWifiOff } from 'react-icons/lu'

/**
 * Fallback страница для оффлайн режима.
 *
 * Показывается когда пользователь пытается открыть страницу,
 * которая не была закэширована, при отсутствии интернета.
 */
export default function OfflinePage() {
  return (
    <Container maxW="container.md" py={20}>
      <VStack gap={6} textAlign="center">
        <Box p={6} borderRadius="full" bg="brand.subtle" color="brand.fg">
          <LuWifiOff size={48} />
        </Box>

        <VStack gap={2}>
          <Heading size="xl">Нет подключения</Heading>
          <Text color="fg.muted" fontSize="lg">
            Эта страница недоступна в оффлайн режиме
          </Text>
        </VStack>

        <Text color="fg.muted" maxW="md">
          Попробуйте открыть одну из закэшированных страниц или дождитесь восстановления подключения к интернету.
        </Text>
      </VStack>
    </Container>
  )
}
