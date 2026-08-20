'use client'

import { PageH1 } from '@/components/page-h1'
import { Badge, Code, HStack, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useEffect, useState } from 'react'
import { z } from 'zod/v4'

const Schema = z.object({
  title: z
    .string()
    .min(2)
    .meta({ ui: { title: 'Report Title', placeholder: 'Daily inspection report' } }),
  location: z.string().meta({ ui: { title: 'Location', placeholder: 'Warehouse A' } }),
  notes: z.string().meta({ ui: { title: 'Notes', placeholder: 'Additional notes...' } }),
  priority: z.enum(['low', 'medium', 'high']).meta({ ui: { title: 'Priority' } }),
})

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true)
  const [queue, setQueue] = useState<Array<Record<string, unknown>>>([])

  useEffect(() => {
    setIsOnline(navigator.onLine)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <Stack gap={6}>
      <div>
        <PageH1 size="lg">Offline-First Forms</PageH1>
        <Text color="fg.muted">
          Forms that work without internet. Data is saved to IndexedDB and synced when connection is restored. Uses{' '}
          <Code>@letar/forms/offline</Code>.
        </Text>
      </div>

      <HStack>
        <Badge colorPalette={isOnline ? 'green' : 'red'} size="lg">
          {isOnline ? 'Online' : 'Offline'}
        </Badge>
        <Text fontSize="sm" color="fg.muted">
          {queue.length > 0 ? `${queue.length} items in sync queue` : 'Queue empty'}
        </Text>
      </HStack>

      <Form
        schema={Schema}
        initialValue={{ title: '', location: '', notes: '', priority: 'medium' }}
        onSubmit={async (data) => {
          if (isOnline) {
            alert(`Submitted online: ${JSON.stringify(data)}`)
          } else {
            setQueue((prev) => [...prev, data])
            alert('Saved to offline queue! Will sync when online.')
          }
        }}
      >
        <Stack gap={4}>
          <Form.Field.String name="title" />
          <Form.Field.String name="location" />
          <Form.Field.Textarea name="notes" />
          <Form.Field.RadioGroup name="priority" options={priorityOptions} orientation="horizontal" />
          <Form.DebugValues showInProduction />
          <Form.Button.Submit>{isOnline ? 'Submit' : 'Save Offline'}</Form.Button.Submit>
        </Stack>
      </Form>
    </Stack>
  )
}
