'use client'

/**
 * Список обнаруженных контейнеров
 */

import { Badge, Button, Card, HStack, Text, VStack } from '@chakra-ui/react'
import { LuPlus } from 'react-icons/lu'
import type { DiscoveredApp } from '../_types'

interface DiscoveredAppsProps {
  apps: DiscoveredApp[]
  onAddApp: (app: DiscoveredApp) => void
}

export function DiscoveredApps({ apps, onAddApp }: DiscoveredAppsProps) {
  if (apps.length === 0) {
    return null
  }

  return (
    <Card.Root mb="4" variant="subtle">
      <Card.Header py="2">
        <Text fontSize="sm" fontWeight="medium">
          Обнаруженные контейнеры
        </Text>
      </Card.Header>
      <Card.Body py="2">
        <VStack gap="2" align="stretch">
          {apps.map((app) => (
            <HStack
              key={app.containerName}
              justify="space-between"
              p="2"
              bg={app.alreadyAdded ? 'bg.muted' : 'bg'}
              borderRadius="md"
              opacity={app.alreadyAdded ? 0.5 : 1}
            >
              <HStack gap="2">
                <Badge colorPalette={app.isRunning ? 'green' : 'gray'} size="sm">
                  {app.isRunning ? 'running' : 'stopped'}
                </Badge>
                <Text fontSize="sm" fontWeight="medium">
                  {app.containerName}
                </Text>
                {app.port && (
                  <Text fontSize="xs" color="fg.muted">
                    :{app.port}
                  </Text>
                )}
              </HStack>
              {!app.alreadyAdded && (
                <Button size="xs" variant="ghost" onClick={() => onAddApp(app)}>
                  <LuPlus />
                  Добавить
                </Button>
              )}
            </HStack>
          ))}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
