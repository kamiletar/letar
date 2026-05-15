'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { usePushNotifications } from '@/app/_hooks/usePushNotifications'
import { Box, HStack, Icon, Stack, Switch, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { FaBell, FaBellSlash } from 'react-icons/fa'

interface PushNotificationToggleProps {
  showPreferences?: boolean
}

export function PushNotificationToggle({ showPreferences = false }: PushNotificationToggleProps) {
  const { permission, isSubscribed, isLoading, error, subscribe, unsubscribe, updatePreferences } =
    usePushNotifications()

  const [preferences, setPreferences] = useState({
    newProducts: true,
    orderStatus: true,
    promotions: true,
    cartReminder: true,
  })

  const handleToggle = async () => {
    if (isSubscribed) {
      const success = await unsubscribe()
      if (success) {
        toaster.success({
          title: 'Уведомления отключены',
          description: 'Вы больше не будете получать push-уведомления',
        })
      }
    } else {
      const success = await subscribe(preferences)
      if (success) {
        toaster.success({
          title: 'Уведомления включены',
          description: 'Теперь вы будете получать важные уведомления',
        })
      } else if (permission === 'denied') {
        toaster.error({
          title: 'Уведомления заблокированы',
          description: 'Разрешите уведомления в настройках браузера для этого сайта',
        })
      }
    }
  }

  const handlePreferenceChange = async (key: keyof typeof preferences, checked: boolean) => {
    const newPreferences = { ...preferences, [key]: checked }
    setPreferences(newPreferences)

    if (isSubscribed) {
      await updatePreferences(newPreferences)
    }
  }

  // Don't show if push notifications are not supported
  if (permission === 'unsupported') {
    return null
  }

  return (
    <Stack gap={4}>
      <HStack justify="space-between">
        <HStack gap={3}>
          <Icon as={isSubscribed ? FaBell : FaBellSlash} boxSize={5} color={isSubscribed ? 'fg.solid' : 'fg.muted'} />
          <Box>
            <Text fontWeight="medium">Push-уведомления</Text>
            <Text fontSize="sm" color="fg.muted">
              {permission === 'denied' ? 'Заблокированы в браузере' : isSubscribed ? 'Включены' : 'Отключены'}
            </Text>
          </Box>
        </HStack>

        <Switch.Root
          checked={isSubscribed}
          onCheckedChange={() => handleToggle()}
          disabled={isLoading || permission === 'denied'}
          colorPalette="fg"
        >
          <Switch.HiddenInput />
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
        </Switch.Root>
      </HStack>

      {error && (
        <Text fontSize="sm" color="red.500">
          {error}
        </Text>
      )}

      {showPreferences && isSubscribed && (
        <VStack align="stretch" gap={3} pl={8}>
          <HStack justify="space-between">
            <Text fontSize="sm">Новые товары</Text>
            <Switch.Root
              size="sm"
              checked={preferences.newProducts}
              onCheckedChange={(e) => handlePreferenceChange('newProducts', e.checked)}
              colorPalette="fg"
            >
              <Switch.HiddenInput />
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Root>
          </HStack>

          <HStack justify="space-between">
            <Text fontSize="sm">Статус заказа</Text>
            <Switch.Root
              size="sm"
              checked={preferences.orderStatus}
              onCheckedChange={(e) => handlePreferenceChange('orderStatus', e.checked)}
              colorPalette="fg"
            >
              <Switch.HiddenInput />
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Root>
          </HStack>

          <HStack justify="space-between">
            <Text fontSize="sm">Акции и скидки</Text>
            <Switch.Root
              size="sm"
              checked={preferences.promotions}
              onCheckedChange={(e) => handlePreferenceChange('promotions', e.checked)}
              colorPalette="fg"
            >
              <Switch.HiddenInput />
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Root>
          </HStack>

          <HStack justify="space-between">
            <Text fontSize="sm">Напоминание о корзине</Text>
            <Switch.Root
              size="sm"
              checked={preferences.cartReminder}
              onCheckedChange={(e) => handlePreferenceChange('cartReminder', e.checked)}
              colorPalette="fg"
            >
              <Switch.HiddenInput />
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Root>
          </HStack>
        </VStack>
      )}
    </Stack>
  )
}
