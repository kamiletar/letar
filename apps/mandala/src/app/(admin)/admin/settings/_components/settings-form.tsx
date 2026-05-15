'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { MandalaForm } from '@/mandala-form'
import { Box, Button, HStack, Separator, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { LuSend } from 'react-icons/lu'
import { testTelegramAction } from '../_actions/test-telegram.action'
import { updateSettingsAction } from '../_actions/update-settings.action'
import { type TelegramSettingsInput, TelegramSettingsSchema } from '../_schemas/settings.schema'

interface SettingsFormProps {
  initialData: TelegramSettingsInput & { hasToken: boolean }
}

/**
 * Форма настроек Telegram уведомлений
 */
export function SettingsForm({ initialData }: SettingsFormProps) {
  const [isTesting, setIsTesting] = useState(false)

  const handleSubmit = async (data: TelegramSettingsInput) => {
    const result = await updateSettingsAction(data)

    if (result.success) {
      toaster.success({ title: 'Настройки сохранены' })
    } else {
      toaster.error({ title: 'Ошибка сохранения', description: result.error })
    }
  }

  const handleTest = async () => {
    setIsTesting(true)
    try {
      const result = await testTelegramAction()

      if (result.success) {
        toaster.success({ title: 'Тестовое сообщение отправлено!' })
      } else {
        toaster.error({ title: 'Ошибка отправки', description: result.error })
      }
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <MandalaForm initialValue={initialData} schema={TelegramSettingsSchema} onSubmit={handleSubmit}>
      <Stack gap={6}>
        {/* Telegram секция */}
        <Box>
          <Text fontWeight="semibold" fontSize="lg" mb={4}>
            Telegram уведомления
          </Text>

          <Stack gap={4}>
            {/* Включить/выключить */}
            <MandalaForm.Field.Switch
              name="telegramEnabled"
              label="Включить уведомления"
              helperText="Уведомления о новых заказах и сообщениях"
            />

            <Separator />

            {/* Bot Token */}
            <MandalaForm.Field.Password
              name="telegramBotToken"
              label="Bot Token"
              placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
              helperText="Получите токен у @BotFather в Telegram"
            />

            {/* Chat ID */}
            <MandalaForm.Field.String
              name="telegramChatId"
              label="Chat ID"
              placeholder="-1001234567890"
              helperText="Узнайте ваш ID у @userinfobot или @getmyid_bot"
            />

            {/* Кнопка теста */}
            <Box>
              <Button
                variant="outline"
                size="sm"
                disabled={!initialData.hasToken || isTesting}
                loading={isTesting}
                onClick={handleTest}
              >
                <LuSend />
                Отправить тестовое сообщение
              </Button>
              {!initialData.hasToken && (
                <Text fontSize="xs" color="fg.muted" mt={1}>
                  Сначала сохраните настройки для тестирования
                </Text>
              )}
            </Box>
          </Stack>
        </Box>

        <Separator />

        <MandalaForm.Errors />

        {/* Кнопка сохранения */}
        <HStack justify="flex-end">
          <MandalaForm.Button.Submit colorPalette="brand">Сохранить настройки</MandalaForm.Button.Submit>
        </HStack>
      </Stack>
    </MandalaForm>
  )
}
