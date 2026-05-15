/**
 * Страница оффлайн — показывается когда нет сети
 */

import { Box, Heading, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { LuWifiOff } from 'react-icons/lu'

export const metadata: Metadata = {
  title: 'Нет подключения — КБС',
}

export default function OfflinePage() {
  return (
    <VStack gap={4} py={20} textAlign="center">
      <Box color="fg.muted">
        <LuWifiOff size={64} />
      </Box>
      <Heading size="xl">Нет подключения</Heading>
      <Text color="fg.muted" maxW="400px">
        Проверьте подключение к интернету и попробуйте снова. Некоторые страницы могут быть доступны из кэша.
      </Text>
    </VStack>
  )
}
