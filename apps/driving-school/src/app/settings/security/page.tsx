import { getSession } from '@/lib/auth'
import { Box, Button, Container, Heading, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LuArrowLeft, LuConstruction } from 'react-icons/lu'

export const metadata = {
  title: 'Безопасность',
  description: 'Настройки безопасности аккаунта',
}

export default async function SecuritySettingsPage() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  return (
    <Container maxW="container.md" py={8}>
      <VStack gap={6} align="stretch">
        {/* Навигация */}
        <Box>
          <Button asChild variant="ghost" size="sm">
            <Link href="/settings">
              <LuArrowLeft />
              Назад к настройкам
            </Link>
          </Button>
        </Box>

        {/* Заголовок */}
        <Box>
          <Heading size="xl">Безопасность</Heading>
          <Text color="fg.muted" mt={2}>
            Пароль и способы входа
          </Text>
        </Box>

        {/* Заглушка */}
        <Box bg="bg.panel" p={8} borderRadius="lg" shadow="sm" borderWidth="1px" textAlign="center">
          <VStack gap={4}>
            <Box color="fg.muted">
              <LuConstruction size={48} />
            </Box>
            <Heading size="md">В разработке</Heading>
            <Text color="fg.muted">Настройки безопасности скоро будут доступны</Text>
          </VStack>
        </Box>
      </VStack>
    </Container>
  )
}
