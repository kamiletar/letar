import { requireAuth } from '@/lib/auth'
import { Box, Button, Heading, HStack, Stack, Text } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { LuArrowLeft } from 'react-icons/lu'
import { ProfileSettingsForm } from './_components/profile-settings-form'

export const metadata: Metadata = {
  title: 'Настройки профиля',
}

/**
 * Страница настроек профиля — редактирование имени
 */
export default async function ProfileSettingsPage() {
  const session = await requireAuth()

  return (
    <Box maxW="md" mx="auto" p={6}>
      <HStack mb={6}>
        <Button variant="ghost" size="sm" asChild>
          <a href="/profile">
            <LuArrowLeft />
            Профиль
          </a>
        </Button>
      </HStack>
      <Stack gap={6}>
        <Box>
          <Heading size="xl" mb={2}>
            Настройки профиля
          </Heading>
          <Text color="fg.muted" fontSize="sm">
            {session.user.email}
          </Text>
        </Box>

        <ProfileSettingsForm currentName={session.user.name ?? ''} />
      </Stack>
    </Box>
  )
}
