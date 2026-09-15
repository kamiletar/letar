/**
 * Обёртка секции настроек — заголовок, описание, содержимое
 */

import { Box, Stack, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'

interface SettingsCardProps {
  title: string
  description?: string
  children: ReactNode
}

export function SettingsCard({ title, description, children }: SettingsCardProps) {
  return (
    <Box bg="bg.panel" borderWidth="1px" borderColor="border" rounded="l3" p="4">
      <Stack gap="1" mb="3">
        <Text fontSize="sm" fontWeight="600" color="fg">
          {title}
        </Text>
        {description && (
          <Text fontSize="xs" color="fg.subtle">
            {description}
          </Text>
        )}
      </Stack>
      {children}
    </Box>
  )
}
