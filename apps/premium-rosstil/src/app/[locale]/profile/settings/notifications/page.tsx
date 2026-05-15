import { requireAuth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Card, Container, Heading, Text } from '@chakra-ui/react'
import { NotificationSettingsForm } from './_components/notification-settings-form'

export default async function NotificationsSettingsPage() {
  // Проверка аутентификации
  const authUser = await requireAuth()

  const userId = authUser.id
  const db = getEnhancedPrisma(authUser)

  // Загрузка настроек уведомлений (или использование дефолтных значений)
  const preferences = await db.notificationPreferences.findUnique({
    where: { userId },
  })

  // Дефолтные значения из схемы
  const initialPreferences = {
    emailOrderStatus: preferences?.emailOrderStatus ?? true,
    emailPromotions: preferences?.emailPromotions ?? true,
    emailNewsletter: preferences?.emailNewsletter ?? false,
    smsOrderStatus: preferences?.smsOrderStatus ?? false,
  }

  return (
    <Container maxW="4xl" py={8}>
      <Heading as="h1" size="2xl" mb={2}>
        Настройки уведомлений
      </Heading>
      <Text color="fg.muted" mb={8}>
        Управление email и SMS уведомлениями о заказах, акциях и новостях
      </Text>

      <Card.Root>
        <Card.Body>
          <NotificationSettingsForm initialPreferences={initialPreferences} />
        </Card.Body>
      </Card.Root>
    </Container>
  )
}
