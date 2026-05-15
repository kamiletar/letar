'use client'

import { Badge, ChakraProvider, defaultSystem, HStack, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useEffect, useState } from 'react'
import { z } from 'zod/v4'

const Schema = z.object({
  title: z
    .string()
    .min(2)
    .meta({ ui: { title: 'Report Title', placeholder: 'Daily inspection' } }),
  location: z.string().meta({ ui: { title: 'Location', placeholder: 'Warehouse A' } }),
  notes: z.string().meta({ ui: { title: 'Notes' } }),
})

export default function OfflineDemoPage() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(navigator.onLine)
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  return (
    <ChakraProvider value={defaultSystem}>
      <Stack gap={4}>
        <HStack>
          <Badge colorPalette={isOnline ? 'green' : 'red'} size="lg">
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
          <Text fontSize="sm" color="fg.muted">
            Try disconnecting your network!
          </Text>
        </HStack>

        <Form
          schema={Schema}
          initialValue={{ title: '', location: '', notes: '' }}
          onSubmit={async (data) => {
            if (isOnline) {
              alert('Submitted online!')
            } else {
              alert('Saved to offline queue!')
            }
          }}
        >
          <Stack gap={3}>
            <Form.Field.String name="title" />
            <Form.Field.String name="location" />
            <Form.Field.Textarea name="notes" />
            <Form.DebugValues showInProduction />
            <Form.Button.Submit>{isOnline ? 'Submit' : 'Save Offline'}</Form.Button.Submit>
          </Stack>
        </Form>
      </Stack>
    </ChakraProvider>
  )
}
