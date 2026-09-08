'use client'

/**
 * Offline-first формы — реальный `@letar/forms/offline` (useOfflineForm + IndexedDB-очередь
 * через useSyncQueue), не самодельная имитация через navigator.onLine. Библиотека не даёт
 * форсировать offline-статус программно (индикаторы читают настоящий navigator.onLine), поэтому
 * "Simulate Offline" не подделывает статус, а маршрутизирует submit напрямую в ту же очередь
 * (`addAction` из `useSyncQueue` — тот же singleton store, что использует `useOfflineForm`
 * внутри), не дожидаясь настоящего отключения сети.
 */

import { PageH1 } from '@/components/page-h1'
import { Badge, Button, Code, HStack, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { FormOfflineIndicator, FormSyncStatus, useOfflineForm, useSyncQueue } from '@letar/forms/offline'
import { useState } from 'react'
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

type ReportValues = z.infer<typeof Schema>

const ACTION_TYPE = 'CREATE_INSPECTION_REPORT'

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

export default function OfflinePage() {
  const [simulateOffline, setSimulateOffline] = useState(false)
  const [lastResult, setLastResult] = useState<string | null>(null)

  const { submit, isOffline } = useOfflineForm<ReportValues>({
    actionType: ACTION_TYPE,
    onlineSubmit: async () => {
      await new Promise((r) => setTimeout(r, 800))
      return { success: true }
    },
    onSuccess: () => setLastResult('Submitted online.'),
    onQueued: () => setLastResult('Saved to offline queue — will sync when online.'),
    onError: (error) => setLastResult(`Error: ${error}`),
  })

  const { addAction, pendingCount, isProcessing } = useSyncQueue()

  const effectivelyOffline = simulateOffline || isOffline

  return (
    <Stack gap={6}>
      <div>
        <PageH1 size="lg">Offline-First Forms</PageH1>
        <Text color="fg.muted">
          Forms that work without internet — data is saved to a real IndexedDB queue via <Code>useOfflineForm</Code>
          {' '}
          and synced automatically when connection is restored.
        </Text>
      </div>

      <HStack gap={3} flexWrap="wrap">
        <FormOfflineIndicator />
        {simulateOffline && <Badge colorPalette="orange">Simulated offline</Badge>}
        <FormSyncStatus showWhenEmpty />
        <Button size="sm" variant="outline" onClick={() => setSimulateOffline((v) => !v)}>
          {simulateOffline ? 'Stop Simulating Offline' : 'Simulate Offline'}
        </Button>
      </HStack>

      <Form
        schema={Schema}
        initialValue={{ title: '', location: '', notes: '', priority: 'medium' }}
        onSubmit={async (data) => {
          if (simulateOffline) {
            await addAction({ type: ACTION_TYPE, payload: data })
            setLastResult('Saved to offline queue (simulated) — will sync when you submit again online.')
            return
          }
          await submit(data as ReportValues)
        }}
      >
        <Stack gap={4}>
          <Form.Field.String name="title" />
          <Form.Field.String name="location" />
          <Form.Field.Textarea name="notes" />
          <Form.Field.RadioGroup name="priority" options={priorityOptions} orientation="horizontal" />
          <Form.DebugValues showInProduction />
          <Form.Button.Submit>{effectivelyOffline ? 'Save Offline' : 'Submit'}</Form.Button.Submit>
        </Stack>
      </Form>

      {lastResult && (
        <Text fontSize="sm" color="fg.muted">
          {lastResult}
        </Text>
      )}

      <Text fontSize="sm" color="fg.muted">
        {isProcessing
          ? 'Syncing queued reports...'
          : pendingCount > 0
          ? `${pendingCount} report(s) queued locally.`
          : 'Queue empty.'}
      </Text>
    </Stack>
  )
}
