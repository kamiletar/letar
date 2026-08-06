'use client'

import { Alert, Box, Button, Code, Heading, Stack, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

interface SecretBannerProps {
  secret: string
  clientId: string
}

/**
 * Показывает plaintext clientSecret ОДИН РАЗ после создания/ротации.
 * Исчезает при перезагрузке — секрет больше не доступен в открытом виде.
 */
export function SecretBanner({ secret, clientId }: SecretBannerProps) {
  const [copied, setCopied] = useState(false)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 5 * 60 * 1000)
    return () => clearTimeout(timer)
  }, [])

  if (!visible) {
    return null
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Alert.Root status="warning" borderRadius="md" mb={6}>
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>
          <Heading size="sm">Сохрани секрет прямо сейчас</Heading>
        </Alert.Title>
        <Alert.Description>
          <Stack gap={3} mt={2}>
            <Text fontSize="sm">
              Секрет клиента <Code fontSize="xs">{clientId}</Code>{' '}
              показывается только один раз и недоступен после перезагрузки страницы.
            </Text>
            <Box bg="bg.subtle" p={3} borderRadius="md" borderWidth={1} borderColor="border">
              <Code fontSize="sm" whiteSpace="pre-wrap" wordBreak="break-all">
                {secret}
              </Code>
            </Box>
            <Box>
              <Button size="sm" variant="outline" onClick={handleCopy}>
                {copied ? 'Скопировано!' : 'Скопировать'}
              </Button>
            </Box>
          </Stack>
        </Alert.Description>
      </Alert.Content>
    </Alert.Root>
  )
}
