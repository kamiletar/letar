import { Link } from '@/i18n/navigation'
import { redirect } from '@/i18n/server-redirect'
import { getSession } from '@/lib/auth'
import { Button, Card, Container, Heading, Stack, Text } from '@chakra-ui/react'
import { FaBell, FaChevronRight } from 'react-icons/fa'
import { DeleteAccountDialog } from './_components/delete-account-dialog'

export default async function SettingsPage() {
  // Проверка аутентификации
  const session = await getSession()

  if (!session?.user) {
    redirect('/auth/signin')
  }

  return (
    <Container maxW="4xl" py={8}>
      <Heading as="h1" size="2xl" mb={8}>
        Настройки
      </Heading>

      <Stack gap={6}>
        {/* Настройки уведомлений */}
        <Card.Root>
          <Card.Header>
            <Heading size="lg" display="flex" alignItems="center" gap={2}>
              <FaBell />
              Уведомления
            </Heading>
          </Card.Header>
          <Card.Body>
            <Text mb={4} color="fg.muted">
              Управление настройками email и SMS уведомлений о заказах, рекламных предложениях и новостях.
            </Text>
            <Link href="/profile/settings/notifications">
              <Button colorPalette="fg" variant="outline">
                Настроить уведомления
                <FaChevronRight />
              </Button>
            </Link>
          </Card.Body>
        </Card.Root>

        {/* Опасная зона */}
        <Card.Root borderColor="red.500" borderWidth="2px">
          <Card.Header>
            <Heading size="lg" color="red.500">
              Опасная зона
            </Heading>
          </Card.Header>
          <Card.Body>
            <Text mb={4} color="fg.muted">
              Удаление аккаунта приведет к безвозвратной потере всех ваших данных, включая заказы, адреса, замеры и
              настройки.
            </Text>
            <DeleteAccountDialog />
          </Card.Body>
        </Card.Root>
      </Stack>
    </Container>
  )
}
