'use client'

/**
 * Карточка настроек системного трея
 */

import { Box, Card, Heading, HStack, Icon, Switch, Text, VStack } from '@chakra-ui/react'
import { LuMonitor } from 'react-icons/lu'

import type { Settings } from '@/generated/prisma'

interface TraySettingsCardProps {
  settings: Settings | null | undefined
  onSaveWithTray: (field: string, value: unknown) => void
}

/**
 * Настройки системного трея
 */
export function TraySettingsCard({ settings, onSaveWithTray }: TraySettingsCardProps) {
  return (
    <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
      <Card.Header>
        <HStack gap={3}>
          <Icon as={LuMonitor} color="purple.400" boxSize={5} />
          <Heading size="md">Системный трей</Heading>
        </HStack>
      </Card.Header>
      <Card.Body>
        <VStack gap={4} align="stretch">
          {/* Сворачивать в трей */}
          <HStack justify="space-between">
            <Box>
              <Text fontWeight="medium">Сворачивать в трей</Text>
              <Text fontSize="sm" color="fg.subtle">
                Приложение продолжит работать в фоне
              </Text>
            </Box>
            <Switch.Root
              checked={settings?.minimizeToTray ?? true}
              onCheckedChange={(details) => onSaveWithTray('minimizeToTray', details.checked)}
            >
              <Switch.HiddenInput />
              <Switch.Control />
            </Switch.Root>
          </HStack>

          {/* Закрытие окна в трей */}
          <HStack justify="space-between">
            <Box>
              <Text fontWeight="medium">Закрытие окна в трей</Text>
              <Text fontSize="sm" color="fg.subtle">
                При нажатии на крестик сворачивать в трей вместо закрытия
              </Text>
            </Box>
            <Switch.Root
              checked={settings?.closeToTray ?? true}
              onCheckedChange={(details) => onSaveWithTray('closeToTray', details.checked)}
            >
              <Switch.HiddenInput />
              <Switch.Control />
            </Switch.Root>
          </HStack>

          {/* Показывать уведомление */}
          <HStack justify="space-between">
            <Box>
              <Text fontWeight="medium">Уведомление при сворачивании</Text>
              <Text fontSize="sm" color="fg.subtle">
                Показывать уведомление при сворачивании в трей
              </Text>
            </Box>
            <Switch.Root
              checked={settings?.showTrayNotification ?? true}
              onCheckedChange={(details) => onSaveWithTray('showTrayNotification', details.checked)}
            >
              <Switch.HiddenInput />
              <Switch.Control />
            </Switch.Root>
          </HStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
