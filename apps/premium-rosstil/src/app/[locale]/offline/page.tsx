import { Link } from '@/i18n/navigation'
import { Button, Container, Heading, Icon, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { MdSignalWifiOff } from 'react-icons/md'

export const metadata: Metadata = {
  title: 'Нет подключения | Премиум РосСтиль',
}

export default function OfflinePage() {
  return (
    <Container maxW="md" py={20}>
      <VStack gap={6} textAlign="center">
        <Icon fontSize="6xl" color="fg.muted">
          <MdSignalWifiOff />
        </Icon>
        <Heading size="xl">Нет подключения к интернету</Heading>
        <Text color="fg.muted">
          Проверьте подключение и попробуйте снова. Некоторые страницы могут быть доступны из кэша.
        </Text>
        <Button asChild colorPalette="fg">
          <Link href="/">На главную</Link>
        </Button>
      </VStack>
    </Container>
  )
}
