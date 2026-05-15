'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Box, Heading, Text, VStack } from '@chakra-ui/react'
import { Form, useFormContext } from '@letar/forms'
import { updateNotificationSettings } from '../_actions/update-notification-settings'
import { type NotificationSettingsInput, NotificationSettingsSchema } from '../_schemas/notification-settings.schema'

interface NotificationSettingsFormProps {
  initialValues: NotificationSettingsInput
}

/**
 * Внутренний компонент для отображения дочерних переключателей
 * с зависимостью от emailNotifications
 */
function NotificationSwitches() {
  const form = useFormContext()

  return (
    <form.Subscribe selector={(state) => state.values.emailNotifications as boolean}>
      {(emailNotifications) => (
        <Box opacity={emailNotifications ? 1 : 0.5} pointerEvents={emailNotifications ? 'auto' : 'none'} pl={6}>
          <VStack align="stretch" gap={3}>
            <Box>
              <Form.Field.Switch
                name="notifySessionReminders"
                label="Напоминания о сессиях"
                disabled={!emailNotifications}
              />
              <Text fontSize="sm" color="fg.muted" mt={1}>
                Получать напоминание за 24 часа до сессии
              </Text>
            </Box>

            <Box>
              <Form.Field.Switch name="notifyNewPractices" label="Новые практики" disabled={!emailNotifications} />
              <Text fontSize="sm" color="fg.muted" mt={1}>
                Уведомление при назначении новой практики
              </Text>
            </Box>

            <Box>
              <Form.Field.Switch
                name="notifyPracticeDiary"
                label="Напоминания о дневнике практик"
                disabled={!emailNotifications}
              />
              <Text fontSize="sm" color="fg.muted" mt={1}>
                Напоминание о заполнении дневника практик
              </Text>
            </Box>
          </VStack>
        </Box>
      )}
    </form.Subscribe>
  )
}

export function NotificationSettingsForm({ initialValues }: NotificationSettingsFormProps) {
  const handleSubmit = async (data: NotificationSettingsInput) => {
    const result = await updateNotificationSettings(data)

    if (result.success) {
      toaster.create({
        title: 'Настройки сохранены',
        description: 'Ваши настройки уведомлений успешно обновлены',
        type: 'success',
      })
    } else {
      toaster.create({
        title: 'Ошибка',
        description: result.error,
        type: 'error',
      })
    }
  }

  return (
    <Box p={6} borderWidth="1px" borderRadius="lg" bg="white">
      <Form initialValue={initialValues} schema={NotificationSettingsSchema} onSubmit={handleSubmit}>
        <VStack align="stretch" gap={6}>
          <Box>
            <Heading size="md" mb={2}>
              Настройки уведомлений
            </Heading>
            <Text color="fg.muted" fontSize="sm">
              Управляйте тем, какие email уведомления вы хотите получать
            </Text>
          </Box>

          <VStack align="stretch" gap={4}>
            {/* Главный переключатель */}
            <Box>
              <Form.Field.Switch name="emailNotifications" label="Включить email уведомления" />
              <Text fontSize="sm" color="fg.muted" mt={1}>
                Получать уведомления на почту о событиях в приложении
              </Text>
            </Box>

            {/* Дополнительные настройки (доступны только если email включен) */}
            <NotificationSwitches />
          </VStack>

          {/* Кнопка сохранения */}
          <Box>
            <Form.Button.Submit colorPalette="fg">Сохранить настройки</Form.Button.Submit>
          </Box>

          {/* Ошибки формы */}
          <Form.Errors />
        </VStack>
      </Form>
    </Box>
  )
}
