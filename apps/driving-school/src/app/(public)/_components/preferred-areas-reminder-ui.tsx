'use client'

import { LogoIcon } from '@/app/_components/icons/logo-icon'
import { Alert, Button, HStack, Text } from '@chakra-ui/react'
import Link from 'next/link'

/**
 * UI компонент напоминания о районах (клиентский)
 */
export function PreferredAreasReminderUI() {
  return (
    <Alert.Root status="info" variant="subtle" borderRadius="lg">
      <Alert.Indicator>
        <LogoIcon boxSize={5} />
      </Alert.Indicator>
      <HStack flex={1} justify="space-between" flexWrap="wrap" gap={2}>
        <Text>Укажите предпочитаемые районы в профиле — так будет проще найти инструктора рядом</Text>
        <Button asChild size="sm" variant="outline" colorPalette="blue">
          <Link href="/my-profile">Заполнить</Link>
        </Button>
      </HStack>
    </Alert.Root>
  )
}
