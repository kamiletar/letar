'use client'

import { Header } from '@/app/_components/layout/Header'
import { Badge, Box, Button, Card, Heading, HStack, Input, Text, VStack } from '@chakra-ui/react'
import { use, useEffect, useRef, useState } from 'react'
import { LuDownload } from 'react-icons/lu'

interface LogEntry {
  type: 'log' | 'connected' | 'end' | 'error'
  stream?: 'stdout' | 'stderr'
  message?: string
  timestamp?: string
  containerName?: string
}

export default function AppLogsPage({ params: paramsPromise }: { params: Promise<{ app: string }> }) {
  const params = use(paramsPromise)
  const appName = params.app

  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const [filter, setFilter] = useState('')
  const [streamType, setStreamType] = useState<'all' | 'stdout' | 'stderr'>('all')

  const logsEndRef = useRef<HTMLDivElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  // Connect to SSE stream
  useEffect(() => {
    const eventSource = new EventSource(`/api/apps/${appName}/logs?tail=100`)
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as LogEntry
        setLogs((prev) => [...prev, data])

        if (data.type === 'connected') {
          setIsConnected(true)
        } else if (data.type === 'end' || data.type === 'error') {
          setIsConnected(false)
        }
      } catch (error) {
        console.error('Failed to parse log entry:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error)
      setIsConnected(false)
      eventSource.close()
    }

    return () => {
      eventSource.close()
      setIsConnected(false)
    }
  }, [appName])

  const handleClearLogs = () => {
    setLogs([])
  }

  const handleExportLogs = () => {
    // Format logs for export
    const exportData = filteredLogs
      .filter((log) => log.type === 'log')
      .map((log) => {
        const time = log.timestamp ? new Date(log.timestamp).toISOString() : ''
        return `[${time}] [${log.stream}] ${log.message}`
      })
      .join('\n')

    // Create blob and download
    const blob = new Blob([exportData], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${appName}-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (log.type !== 'log') {
      return true
    }

    // Filter by stream type
    if (streamType !== 'all' && log.stream !== streamType) {
      return false
    }

    // Filter by search text
    if (filter && !log.message?.toLowerCase().includes(filter.toLowerCase())) {
      return false
    }

    return true
  })

  // Format timestamp
  const formatTime = (timestamp?: string) => {
    if (!timestamp) {
      return ''
    }
    const date = new Date(timestamp)
    return date.toLocaleTimeString()
  }

  return (
    <>
      <Header />
      <Box p="8">
        <VStack align="stretch" gap="4" mb="6">
          <HStack justify="space-between">
            <Heading>Logs - {appName}</Heading>
            <Badge colorPalette={isConnected ? 'green' : 'gray'} size="lg" variant="solid">
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </HStack>

          {/* Controls */}
          <HStack gap="4" flexWrap="wrap">
            <Input
              placeholder="Filter logs..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              maxW="300px"
            />

            <HStack gap="2">
              <Button
                size="sm"
                colorPalette={streamType === 'all' ? 'fg' : 'gray'}
                onClick={() => setStreamType('all')}
              >
                All
              </Button>
              <Button
                size="sm"
                colorPalette={streamType === 'stdout' ? 'blue' : 'gray'}
                onClick={() => setStreamType('stdout')}
              >
                stdout
              </Button>
              <Button
                size="sm"
                colorPalette={streamType === 'stderr' ? 'red' : 'gray'}
                onClick={() => setStreamType('stderr')}
              >
                stderr
              </Button>
            </HStack>

            <Button size="sm" colorPalette={autoScroll ? 'green' : 'gray'} onClick={() => setAutoScroll(!autoScroll)}>
              Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
            </Button>

            <Button size="sm" colorPalette="red" onClick={handleClearLogs}>
              Clear
            </Button>

            <Button
              size="sm"
              colorPalette="fg"
              onClick={handleExportLogs}
              disabled={filteredLogs.filter((l) => l.type === 'log').length === 0}
            >
              <LuDownload />
              Export
            </Button>
          </HStack>
        </VStack>

        {/* Logs display */}
        <Card.Root>
          <Card.Body p="4">
            <Box
              bg="black"
              color="green.200"
              p="4"
              borderRadius="md"
              fontFamily="mono"
              fontSize="sm"
              maxH="70vh"
              overflowY="auto"
            >
              {filteredLogs.length === 0 ? (
                <Text color="gray.500">No logs to display</Text>
              ) : (
                <VStack align="stretch" gap="1">
                  {filteredLogs.map((log, idx) => {
                    if (log.type === 'connected') {
                      return (
                        <Text key={idx} color="blue.300">
                          Connected to {log.containerName}
                        </Text>
                      )
                    }

                    if (log.type === 'end') {
                      return (
                        <Text key={idx} color="yellow.300">
                          Stream ended
                        </Text>
                      )
                    }

                    if (log.type === 'error') {
                      return (
                        <Text key={idx} color="red.300">
                          Error: {log.message}
                        </Text>
                      )
                    }

                    return (
                      <HStack key={idx} gap="2" alignItems="flex-start" wordBreak="break-all">
                        <Text color="gray.500" flexShrink={0}>
                          [{formatTime(log.timestamp)}]
                        </Text>
                        <Badge colorPalette={log.stream === 'stderr' ? 'red' : 'blue'} size="xs" flexShrink={0}>
                          {log.stream}
                        </Badge>
                        <Text flex="1" color={log.stream === 'stderr' ? 'red.200' : 'green.200'}>
                          {log.message}
                        </Text>
                      </HStack>
                    )
                  })}
                  <div ref={logsEndRef} />
                </VStack>
              )}
            </Box>
          </Card.Body>
        </Card.Root>
      </Box>
    </>
  )
}
