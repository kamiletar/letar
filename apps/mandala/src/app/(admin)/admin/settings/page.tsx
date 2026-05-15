export const dynamic = 'force-dynamic'

import { Box, Heading, Text, VStack } from '@chakra-ui/react'
import { LuSettings } from 'react-icons/lu'

import { getSettingsAction } from './_actions/get-settings.action'
import { SettingsForm } from './_components/settings-form'

export default async function SettingsPage() {
  const settings = await getSettingsAction()

  return (
    <VStack align="stretch" gap={6}>
      {/* Заголовок */}
      <Box>
        <Heading size="lg" display="flex" alignItems="center" gap={2}>
          <LuSettings />
          Настройки
        </Heading>
        <Text color="fg.muted" mt={1}>
          Управление уведомлениями и интеграциями
        </Text>
      </Box>

      {/* Форма настроек */}
      <Box bg="bg.panel" borderRadius="lg" p={6} shadow="sm">
        <SettingsForm initialData={settings} />
      </Box>
    </VStack>
  )
}
