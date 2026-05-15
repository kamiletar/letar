'use client'

import { Box, Button, Container, Heading, Icon, Text, VStack } from '@chakra-ui/react'
import { LuRefreshCw, LuWifiOff } from 'react-icons/lu'

/**
 * Страница оффлайн режима
 *
 * Отображается когда пользователь оффлайн и страница не закэширована
 */
export default function OfflinePage() {
  const handleReload = () => {
    window.location.reload()
  }

  return (
    <main role="main">
      <Container maxW="md" py={20}>
        <VStack gap={6} textAlign="center">
          <Box p={4} borderRadius="full" bg="orange.100" _dark={{ bg: 'orange.900' }}>
            <Icon color="orange.500" boxSize={12}>
              <LuWifiOff />
            </Icon>
          </Box>

          <Heading size="xl">Нет подключения к интернету</Heading>

          <Text color="fg.muted" maxW="sm">
            Проверьте подключение к сети. Некоторые функции приложения недоступны в оффлайн режиме.
          </Text>

          <VStack gap={3} w="full" maxW="xs">
            <Text fontSize="sm" color="fg.muted" fontWeight="medium">
              Доступно оффлайн:
            </Text>
            <VStack gap={1} fontSize="sm" color="fg.muted">
              <Text>• Просмотр закэшированного расписания</Text>
              <Text>• Просмотр ваших занятий</Text>
              <Text>• Действия в очереди синхронизации</Text>
            </VStack>
          </VStack>

          <Button colorPalette="brand" size="lg" onClick={handleReload}>
            <Icon mr={2}>
              <LuRefreshCw />
            </Icon>
            Попробовать снова
          </Button>
        </VStack>
      </Container>
    </main>
  )
}
