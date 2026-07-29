'use client'

import { RemoteServerDeploy } from '@/app/_components/deploy/RemoteServerDeploy'
import { Header } from '@/app/_components/layout/Header'
import { useServerContext } from '@/lib/contexts/ServerContext'
import { Badge, Box, Heading, HStack, Spinner, Text } from '@chakra-ui/react'

export default function DeployPage() {
  const { currentServer, isLoading } = useServerContext()

  return (
    <>
      <Header />
      <Box p={{ base: '4', md: '8' }}>
        <HStack justify="space-between" mb="6" flexWrap="wrap" gap="2">
          <HStack gap="4" flexWrap="wrap">
            <Heading>Deploy</Heading>
            {currentServer && (
              <Badge colorPalette={currentServer.isLocal ? 'green' : 'blue'} size="lg">
                {currentServer.displayName}
              </Badge>
            )}
          </HStack>
        </HStack>

        {isLoading && (
          <Box p="8" textAlign="center">
            <Spinner size="xl" colorPalette="brand" />
            <Text mt="4" color="fg.muted">
              Загрузка серверов...
            </Text>
          </Box>
        )}

        {!isLoading && !currentServer && (
          <Box p="8">
            <Text color="fg.muted">Сервер не выбран</Text>
          </Box>
        )}

        {!isLoading && currentServer && <RemoteServerDeploy server={currentServer} />}
      </Box>
    </>
  )
}
