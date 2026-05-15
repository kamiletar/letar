'use client'

import { PushNotificationToggle } from '@/app/_components/push-notification-toggle'
import { toaster } from '@/app/_components/ui/toaster'
import { Box, Field, Separator, Stack, Switch, Text } from '@chakra-ui/react'
import { useState, useTransition } from 'react'
import { updatePreferences } from '../_actions/update-preferences'

interface NotificationSettingsFormProps {
  initialPreferences: {
    emailOrderStatus: boolean
    emailPromotions: boolean
    emailNewsletter: boolean
    smsOrderStatus: boolean
  }
}

/**
 * Форма настроек уведомлений.
 *
 * Использует Switch компоненты для управления настройками:
 * - Автоматически сохраняет изменения при переключении
 * - Показывает toast-уведомления при успехе/ошибке
 * - Disabled состояние во время сохранения
 */
export function NotificationSettingsForm({ initialPreferences }: NotificationSettingsFormProps) {
  const [preferences, setPreferences] = useState(initialPreferences)
  const [isPending, startTransition] = useTransition()

  const handleChange = (field: keyof typeof preferences, value: boolean) => {
    const newPreferences = { ...preferences, [field]: value }
    setPreferences(newPreferences)

    startTransition(async () => {
      try {
        const result = await updatePreferences(newPreferences)

        if (result.success) {
          toaster.success({
            title: 'Настройки сохранены',
            description: 'Ваши настройки уведомлений успешно обновлены',
          })
        } else {
          toaster.error({
            title: 'Ошибка',
            description: result.error || 'Не удалось сохранить настройки',
          })
          // Откатываем изменения при ошибке
          setPreferences(preferences)
        }
      } catch (error) {
        console.error('Failed to update preferences:', error)
        toaster.error({
          title: 'Ошибка',
          description: 'Не удалось сохранить настройки. Попробуйте еще раз.',
        })
        // Откатываем изменения при ошибке
        setPreferences(preferences)
      }
    })
  }

  return (
    <Stack gap={6}>
      {/* Push-уведомления */}
      <PushNotificationToggle showPreferences />

      <Separator />

      {/* Email уведомления о заказах */}
      <Field.Root>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box flex="1" mr={4}>
            <Field.Label fontWeight="semibold" mb={1}>
              Email уведомления о заказах
            </Field.Label>
            <Text fontSize="sm" color="fg.muted">
              Получать email при изменении статуса заказа (новый, подтвержден, отправлен, доставлен)
            </Text>
          </Box>
          <Switch.Root
            checked={preferences.emailOrderStatus}
            onCheckedChange={(e) => handleChange('emailOrderStatus', e.checked)}
            disabled={isPending}
            colorPalette="fg"
            flexShrink={0}
          >
            <Switch.HiddenInput />
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch.Root>
        </Box>
      </Field.Root>

      {/* Email рекламные предложения */}
      <Field.Root>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box flex="1" mr={4}>
            <Field.Label fontWeight="semibold" mb={1}>
              Email рекламные предложения
            </Field.Label>
            <Text fontSize="sm" color="fg.muted">
              Получать email с информацией о скидках, акциях и специальных предложениях
            </Text>
          </Box>
          <Switch.Root
            checked={preferences.emailPromotions}
            onCheckedChange={(e) => handleChange('emailPromotions', e.checked)}
            disabled={isPending}
            colorPalette="fg"
            flexShrink={0}
          >
            <Switch.HiddenInput />
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch.Root>
        </Box>
      </Field.Root>

      {/* Email новости */}
      <Field.Root>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box flex="1" mr={4}>
            <Field.Label fontWeight="semibold" mb={1}>
              Email рассылка новостей
            </Field.Label>
            <Text fontSize="sm" color="fg.muted">
              Получать email с новостями о новых коллекциях, событиях и обновлениях
            </Text>
          </Box>
          <Switch.Root
            checked={preferences.emailNewsletter}
            onCheckedChange={(e) => handleChange('emailNewsletter', e.checked)}
            disabled={isPending}
            colorPalette="fg"
            flexShrink={0}
          >
            <Switch.HiddenInput />
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch.Root>
        </Box>
      </Field.Root>

      {/* SMS уведомления о заказах */}
      <Field.Root>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box flex="1" mr={4}>
            <Field.Label fontWeight="semibold" mb={1}>
              SMS уведомления о заказах
            </Field.Label>
            <Text fontSize="sm" color="fg.muted">
              Получать SMS при изменении статуса заказа (отправлен, доставлен)
            </Text>
          </Box>
          <Switch.Root
            checked={preferences.smsOrderStatus}
            onCheckedChange={(e) => handleChange('smsOrderStatus', e.checked)}
            disabled={isPending}
            colorPalette="fg"
            flexShrink={0}
          >
            <Switch.HiddenInput />
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch.Root>
        </Box>
      </Field.Root>
    </Stack>
  )
}
