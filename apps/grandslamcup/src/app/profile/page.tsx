/**
 * Страница профиля пользователя.
 * Позволяет изменить имя и загрузить аватар.
 */

import { requireAuth } from '@/lib/auth'
import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { LuArrowLeft } from 'react-icons/lu'
import { ProfileEditor } from './_components/profile-editor'
import { TelegramLinkSection } from './_components/telegram-link-section'

export const metadata: Metadata = {
  title: 'Профиль — Grand Slam Cup',
}

export default async function ProfilePage() {
  const session = await requireAuth()

  return (
    <Box minH="100vh" bg="bg" py={10}>
      <Container maxW="lg">
        <VStack gap={8} align="stretch">
          {/* Назад */}
          <Box asChild>
            <Link href="/">
              <Box
                display="inline-flex"
                alignItems="center"
                gap={1}
                color="fg.muted"
                fontSize="sm"
                _hover={{ color: 'brand.solid' }}
              >
                <LuArrowLeft size={16} />
                На главную
              </Box>
            </Link>
          </Box>

          {/* Заголовок */}
          <VStack gap={1}>
            <Heading size="xl">Профиль</Heading>
            <Text color="fg.muted" fontSize="sm">
              Управление вашим аккаунтом
            </Text>
          </VStack>

          {/* Редактор */}
          <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border" p={8}>
            <ProfileEditor
              user={{
                id: session.user.id,
                name: session.user.name,
                email: session.user.email,
                image: session.user.image ?? null,
              }}
            />
          </Box>

          {/* Привязка Telegram */}
          <TelegramLinkSection />
        </VStack>
      </Container>
    </Box>
  )
}
