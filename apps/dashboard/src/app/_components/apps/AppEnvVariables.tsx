'use client'

import { Badge, Box, Button, Card, Code, Heading, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { LuEye, LuEyeOff, LuLock, LuLockOpen } from 'react-icons/lu'

interface EnvVariable {
  key: string
  value: string
  sensitive: boolean
  masked: boolean
}

interface EnvData {
  appName: string
  containerId: string
  envCount: number
  sensitiveCount: number
  variables: EnvVariable[]
}

async function fetchEnvVariables(appName: string, showValues: boolean): Promise<EnvData> {
  const res = await fetch(`/api/apps/${appName}/env?showValues=${showValues}`)
  if (!res.ok) {
    throw new Error('Failed to fetch env variables')
  }
  return res.json()
}

interface AppEnvVariablesProps {
  appName: string
}

export function AppEnvVariables({ appName }: AppEnvVariablesProps) {
  const [showValues, setShowValues] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['app-env', appName, showValues],
    queryFn: () => fetchEnvVariables(appName, showValues),
  })

  if (isLoading) {
    return (
      <Card.Root>
        <Card.Header>
          <Heading size="md">Environment Variables</Heading>
        </Card.Header>
        <Card.Body>
          <Text color="fg.muted">Loading...</Text>
        </Card.Body>
      </Card.Root>
    )
  }

  if (error || !data) {
    return (
      <Card.Root>
        <Card.Header>
          <Heading size="md">Environment Variables</Heading>
        </Card.Header>
        <Card.Body>
          <Text color="red.400">Failed to load environment variables</Text>
        </Card.Body>
      </Card.Root>
    )
  }

  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between">
          <HStack gap={3}>
            <Heading size="md">Environment Variables</Heading>
            <Badge colorPalette="blue" size="sm">
              {data.envCount} vars
            </Badge>
            {data.sensitiveCount > 0 && (
              <Badge colorPalette="yellow" size="sm">
                <Icon mr={1}>
                  <LuLock />
                </Icon>
                {data.sensitiveCount} sensitive
              </Badge>
            )}
          </HStack>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowValues(!showValues)}
            colorPalette={showValues ? 'red' : 'gray'}
          >
            <Icon mr={1}>{showValues ? <LuEyeOff /> : <LuEye />}</Icon>
            {showValues ? 'Hide Values' : 'Show Values'}
          </Button>
        </HStack>
      </Card.Header>
      <Card.Body>
        <Box maxH="400px" overflowY="auto" bg="bg.subtle" rounded="md" p={3}>
          <VStack align="stretch" gap={1}>
            {data.variables.map((envVar, idx) => (
              <HStack
                key={idx}
                justify="space-between"
                py={1}
                px={2}
                bg={envVar.sensitive ? 'yellow.900/20' : 'transparent'}
                rounded="sm"
                _hover={{ bg: 'bg.emphasized' }}
              >
                <HStack gap={2} minW="200px">
                  <Icon color={envVar.sensitive ? 'yellow.400' : 'fg.muted'} fontSize="xs">
                    {envVar.sensitive ? <LuLock /> : <LuLockOpen />}
                  </Icon>
                  <Code bg="transparent" color="blue.300" fontSize="xs">
                    {envVar.key}
                  </Code>
                </HStack>
                <Text
                  fontSize="xs"
                  color={envVar.masked ? 'fg.muted' : 'fg'}
                  fontFamily="mono"
                  flex={1}
                  textAlign="right"
                  wordBreak="break-all"
                >
                  {envVar.value}
                </Text>
              </HStack>
            ))}
          </VStack>
        </Box>
      </Card.Body>
    </Card.Root>
  )
}
