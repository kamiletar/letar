import { Container, Heading, Stack } from '@chakra-ui/react'
import { requireAuth } from '@/lib/auth-utils'
import { ProfileSettingsForm } from './_components/profile-settings-form'

export default async function SettingsPage() {
  const user = await requireAuth()

  return (
    <Container maxW="2xl" py={{ base: 8, md: 12 }}>
      <Stack gap={6}>
        <Heading as="h1" size="3xl">
          Настройки
        </Heading>
        <ProfileSettingsForm
          email={user.email}
          name={user.name ?? ''}
          phone={user.phone ?? ''}
        />
      </Stack>
    </Container>
  )
}
