'use client'

import { Badge, Box, Button, Heading, HStack, Tabs, Text, VStack } from '@chakra-ui/react'
import { Form, useOfflineForm, useOfflineStatus, useSyncQueue } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'

/**
 * Simple schema for offline demo
 */
const DemoSchema = z.object({
  name: z
    .string()
    .min(2)
    .meta({
      ui: { title: 'Имя', placeholder: 'Введите имя' },
    }),
  email: z
    .string()
    .email()
    .meta({
      ui: { title: 'Email', placeholder: 'Введите email' },
    }),
  message: z
    .string()
    .min(10)
    .meta({
      ui: { title: 'Сообщение', placeholder: 'Введите сообщение...' },
    }),
})

type DemoFormData = z.infer<typeof DemoSchema>

const initialValues: DemoFormData = {
  name: '',
  email: '',
  message: '',
}

/**
 * Log entry type
 */
interface LogEntry {
  id: number
  timestamp: Date
  type: 'info' | 'success' | 'error' | 'warning'
  message: string
}

/**
 * Offline Demo Page
 *
 * Demonstrates two approaches:
 * 1. Declarative: <Form offline={{...}}> - новый API
 * 2. Hook-based: useOfflineForm() - для кастомной логики
 *
 * Features:
 * - Form.OfflineIndicator - shows when browser is offline
 * - Form.SyncStatus - shows sync queue status
 * - Automatic sync when connection restores
 */
export default function OfflineDemoPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [submittedData, setSubmittedData] = useState<DemoFormData | null>(null)
  const [simulatedOffline, setSimulatedOffline] = useState(false)

  const isOffline = useOfflineStatus()
  const { queue, queueLength, pendingCount, isProcessing } = useSyncQueue()

  // Add log entry
  const addLog = (type: LogEntry['type'], message: string) => {
    setLogs((prev) => [
      {
        id: Date.now(),
        timestamp: new Date(),
        type,
        message,
      },
      ...prev.slice(0, 19), // Keep last 20 entries
    ])
  }

  // Simulated online submit
  const handleOnlineSubmit = async (value: DemoFormData): Promise<{ success: boolean; error?: string }> => {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // If simulated offline, fail
    if (simulatedOffline) {
      return { success: false, error: 'Simulated offline mode' }
    }

    // Success
    setSubmittedData(value)
    return { success: true }
  }

  const {
    submit,
    isOffline: hookOffline,
    isProcessing: hookIsProcessing,
  } = useOfflineForm({
    actionType: 'FORM_SUBMIT',
    onlineSubmit: handleOnlineSubmit,
    onSuccess: () => addLog('success', 'Форма отправлена успешно!'),
    onQueued: () => addLog('info', 'Форма сохранена в очередь'),
    onError: (error) => addLog('error', `Ошибка: ${error}`),
  })

  // Handle form submit (для hook-based подхода)
  const handleHookSubmit = async (data: DemoFormData) => {
    addLog('info', 'Отправка формы...')
    await submit(data)
  }

  // Handle declarative submit (для declarative подхода)
  const handleDeclarativeSubmit = async (data: DemoFormData) => {
    addLog('info', 'Отправка формы (декларативный)...')
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setSubmittedData(data)
  }

  // Toggle simulated offline
  const toggleSimulatedOffline = () => {
    setSimulatedOffline((prev) => {
      const newValue = !prev
      addLog('warning', newValue ? 'Симуляция оффлайн включена' : 'Симуляция оффлайн выключена')
      return newValue
    })
  }

  return (
    <Box p={8} maxW="900px" mx="auto">
      <Heading mb={2}>Оффлайн формы</Heading>
      <Text color="fg.muted" mb={6}>
        Демонстрация оффлайн-функциональности. Формы, отправленные без соединения, сохраняются в IndexedDB и
        автоматически синхронизируются при восстановлении связи.
      </Text>

      {/* Status indicators */}
      <HStack mb={6} gap={4} wrap="wrap">
        <Form.OfflineIndicator />
        <Form.SyncStatus showWhenEmpty />
        {simulatedOffline && (
          <Badge colorPalette="red" variant="solid">
            Симуляция оффлайн
          </Badge>
        )}
      </HStack>

      {/* Control buttons */}
      <HStack mb={6} gap={4}>
        <Button onClick={toggleSimulatedOffline} colorPalette={simulatedOffline ? 'green' : 'red'} variant="outline">
          {simulatedOffline ? 'Вернуть онлайн' : 'Симулировать оффлайн'}
        </Button>
      </HStack>

      {/* Tabs for two approaches */}
      <Tabs.Root defaultValue="declarative" variant="enclosed" mb={6}>
        <Tabs.List>
          <Tabs.Trigger value="declarative">Декларативный API</Tabs.Trigger>
          <Tabs.Trigger value="hook">Хук useOfflineForm</Tabs.Trigger>
        </Tabs.List>

        {/* Declarative approach - NEW! */}
        <Tabs.Content value="declarative">
          <Box borderWidth="1px" borderRadius="lg" p={6}>
            <Heading size="sm" mb={4}>
              Новый API: &lt;Form offline=&#123;&#123;...&#125;&#125;&gt;
            </Heading>
            <Text fontSize="sm" color="fg.muted" mb={4}>
              Оффлайн-поддержка встроена прямо в Form. Просто добавь <code>offline</code> prop!
            </Text>

            <Form
              initialValue={initialValues}
              schema={DemoSchema}
              onSubmit={handleDeclarativeSubmit}
              offline={{
                actionType: 'FORM_SUBMIT',
                onQueued: () => addLog('info', '[Декларативный] Сохранено в очередь'),
                onSynced: () => addLog('success', '[Декларативный] Синхронизировано!'),
                onSyncError: (error) => addLog('error', `[Декларативный] Ошибка: ${error}`),
              }}
              persistence={{
                key: 'offline-demo-declarative',
                ttl: 24 * 60 * 60 * 1000,
              }}
            >
              <VStack gap={4} align="stretch">
                <Form.Field.String name="name" />
                <Form.Field.String name="email" />
                <Form.Field.Textarea name="message" rows={3} />
                <Form.OfflineIndicator />
                <Form.Button.Submit>Отправить</Form.Button.Submit>
              </VStack>
            </Form>

            <Box mt={4} p={3} bg="blue.50" borderRadius="md" _dark={{ bg: 'blue.900' }}>
              <Text fontSize="xs" fontFamily="mono">
                {`<Form
  offline={{
    actionType: 'FORM_SUBMIT',
    onQueued: () => toast.info('Сохранено'),
    onSynced: () => toast.success('Синхронизировано'),
  }}
  persistence={{ key: 'my-form-draft' }}
>
  <Form.Field.String name="name" />
  <Form.OfflineIndicator />
  <Form.Button.Submit />
</Form>`}
              </Text>
            </Box>
          </Box>
        </Tabs.Content>

        {/* Hook-based approach */}
        <Tabs.Content value="hook">
          <Box borderWidth="1px" borderRadius="lg" p={6}>
            <Heading size="sm" mb={4}>
              Хук useOfflineForm()
            </Heading>
            <Text fontSize="sm" color="fg.muted" mb={4}>
              Для кастомной логики используй хук напрямую.
            </Text>

            <Form initialValue={initialValues} schema={DemoSchema} onSubmit={handleHookSubmit}>
              <VStack gap={4} align="stretch">
                <Form.Field.String name="name" />
                <Form.Field.String name="email" />
                <Form.Field.Textarea name="message" rows={3} />

                <HStack justify="space-between" align="center">
                  <Form.Button.Submit>
                    {hookOffline || simulatedOffline ? 'Сохранить локально' : 'Отправить'}
                  </Form.Button.Submit>
                  {hookIsProcessing && (
                    <Text fontSize="sm" color="fg.muted">
                      Синхронизация...
                    </Text>
                  )}
                </HStack>
              </VStack>
            </Form>
          </Box>
        </Tabs.Content>
      </Tabs.Root>

      {/* Two-column layout for queue and logs */}
      <HStack align="start" gap={6}>
        {/* Sync Queue */}
        <Box flex="1" p={4} bg="gray.50" borderRadius="md" _dark={{ bg: 'gray.800' }}>
          <Heading size="sm" mb={3}>
            Очередь синхронизации ({queueLength})
          </Heading>
          {queueLength === 0
            ? (
              <Text fontSize="sm" color="fg.muted">
                Очередь пуста
              </Text>
            )
            : (
              <VStack align="stretch" gap={2}>
                {queue.map((item) => (
                  <Box key={item.id} p={2} bg="white" borderRadius="sm" borderWidth="1px" _dark={{ bg: 'gray.700' }}>
                    <HStack justify="space-between">
                      <Text fontSize="xs" fontWeight="medium">
                        {item.action.type}
                      </Text>
                      <Badge
                        size="sm"
                        colorPalette={item.status === 'PENDING' ? 'orange' : item.status === 'SYNCED' ? 'green' : 'red'}
                      >
                        {item.status}
                      </Badge>
                    </HStack>
                    <Text fontSize="xs" color="fg.muted">
                      {new Date(item.createdAt).toLocaleTimeString()}
                    </Text>
                  </Box>
                ))}
              </VStack>
            )}
        </Box>

        {/* Event Log */}
        <Box flex="1" p={4} bg="gray.50" borderRadius="md" _dark={{ bg: 'gray.800' }}>
          <Heading size="sm" mb={3}>
            Лог событий
          </Heading>
          {logs.length === 0
            ? (
              <Text fontSize="sm" color="fg.muted">
                Нет событий
              </Text>
            )
            : (
              <VStack align="stretch" gap={2} maxH="300px" overflowY="auto">
                {logs.map((log) => (
                  <Box key={log.id} p={2} bg="white" borderRadius="sm" borderWidth="1px" _dark={{ bg: 'gray.700' }}>
                    <HStack justify="space-between">
                      <Badge
                        size="sm"
                        colorPalette={log.type === 'success'
                          ? 'green'
                          : log.type === 'error'
                          ? 'red'
                          : log.type === 'warning'
                          ? 'orange'
                          : 'blue'}
                      >
                        {log.type}
                      </Badge>
                      <Text fontSize="xs" color="fg.muted">
                        {log.timestamp.toLocaleTimeString()}
                      </Text>
                    </HStack>
                    <Text fontSize="xs" mt={1}>
                      {log.message}
                    </Text>
                  </Box>
                ))}
              </VStack>
            )}
        </Box>
      </HStack>

      {/* Submitted data */}
      {submittedData && (
        <Box
          mt={6}
          p={4}
          bg="green.50"
          borderRadius="md"
          borderWidth="1px"
          borderColor="green.200"
          _dark={{ bg: 'green.900' }}
        >
          <Heading size="sm" mb={2} color="green.700" _dark={{ color: 'green.200' }}>
            Последние отправленные данные
          </Heading>
          <pre style={{ fontSize: '12px' }}>{JSON.stringify(submittedData, null, 2)}</pre>
        </Box>
      )}

      {/* How it works */}
      <Box
        mt={8}
        p={4}
        bg="blue.50"
        borderRadius="md"
        borderWidth="1px"
        borderColor="blue.200"
        _dark={{ bg: 'blue.900' }}
      >
        <Heading size="sm" mb={2} color="blue.700" _dark={{ color: 'blue.200' }}>
          Как работают оффлайн формы:
        </Heading>
        <VStack align="stretch" gap={2} fontSize="sm">
          <Text>1. Заполни форму выше</Text>
          <Text>2. Нажми &quot;Симулировать оффлайн&quot; для включения режима без связи</Text>
          <Text>3. Отправь форму — она сохранится в очередь синхронизации</Text>
          <Text>4. Нажми &quot;Вернуть онлайн&quot; для восстановления связи</Text>
          <Text>5. Очередь автоматически синхронизируется при восстановлении связи</Text>
          <Text>6. Следи за логом событий и очередью синхронизации</Text>
        </VStack>
      </Box>

      {/* Technical details */}
      <Box mt={4} p={4} bg="gray.100" borderRadius="md" _dark={{ bg: 'gray.800' }}>
        <Heading size="sm" mb={2}>
          Техническая информация:
        </Heading>
        <VStack align="stretch" gap={1} fontSize="xs" fontFamily="mono">
          <Text>Реальный оффлайн: {isOffline ? 'да' : 'нет'}</Text>
          <Text>Симуляция оффлайн: {simulatedOffline ? 'да' : 'нет'}</Text>
          <Text>Хук оффлайн: {hookOffline ? 'да' : 'нет'}</Text>
          <Text>Элементов в очереди: {queueLength}</Text>
          <Text>Ожидающих: {pendingCount}</Text>
          <Text>Синхронизация: {isProcessing ? 'да' : 'нет'}</Text>
        </VStack>
      </Box>
    </Box>
  )
}
