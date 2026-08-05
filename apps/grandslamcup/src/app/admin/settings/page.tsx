/**
 * Страница настроек — Telegram-бот.
 * Доступна только администраторам (layout проверяет роль).
 */

import { prisma } from '@/lib/db'
import { Heading, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'

import { TelegramSettingsForm } from './_components/telegram-settings-form'

export const metadata: Metadata = {
  title: 'Настройки',
}

export default async function SettingsPage() {
  const config = await prisma.telegramConfig.findUnique({ where: { id: 'default' } })

  const initialConfig = config
    ? {
      botToken: config.botToken
        ? `${'*'.repeat(Math.max(0, config.botToken.length - 8))}${config.botToken.slice(-8)}`
        : '',
      botTokenSet: !!config.botToken,
      enabled: config.enabled,
      autoAnnouncement: config.autoAnnouncement,
      autoHalfTime: config.autoHalfTime,
      autoResult: config.autoResult,
    }
    : {
      botToken: '',
      botTokenSet: false,
      enabled: false,
      autoAnnouncement: false,
      autoHalfTime: false,
      autoResult: false,
    }

  return (
    <VStack gap={6} align="stretch">
      <Heading size="lg">Настройки</Heading>
      <TelegramSettingsForm initialConfig={initialConfig} />
    </VStack>
  )
}
