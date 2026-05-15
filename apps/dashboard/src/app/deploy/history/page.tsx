'use client'

import { DeployLogsDialog } from '@/app/_components/deploy/DeployLogsDialog'
import { Header } from '@/app/_components/layout/Header'
import { formatDateTime } from '@/lib/format'
import { Badge, Box, Button, Card, Heading, HStack, Spinner, Text, VStack } from '@chakra-ui/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useState } from 'react'
import { LuFileText } from 'react-icons/lu'

interface DeployHistory {
  lastCommit: string | null
  timestamp: string | null
  app: string | null
}

interface DeployHistoryEntry {
  id: string
  app: string | null
  commitHash: string
  commitMessage: string
  author: string
  startTime: string
  endTime?: string
  status: 'running' | 'success' | 'failed'
  dryRun: boolean
  pid?: number
  logFile?: string
}

interface DeployHistoryResponse {
  success: boolean
  history: DeployHistory
  entries: DeployHistoryEntry[]
}

interface Commit {
  hash: string
  shortHash: string
  message: string
  author: string
  email: string
  date: string
}

interface CommitsResponse {
  success: boolean
  count: number
  commits: Commit[]
}

const KNOWN_APPS = ['premium-rosstil', 'imot', 'dashboard', 'label-printer']

async function fetchDeployHistory(app?: string, status?: string) {
  const params = new URLSearchParams()
  if (app) {
    params.set('app', app)
  }
  if (status) {
    params.set('status', status)
  }
  const url = `/api/deploy/history?${params.toString()}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('Failed to fetch deploy history')
  }
  return (await res.json()) as DeployHistoryResponse
}

async function fetchCommits() {
  const res = await fetch('/api/git/commits?maxCount=50')
  if (!res.ok) {
    throw new Error('Failed to fetch commits')
  }
  return (await res.json()) as CommitsResponse
}

export default function DeployHistoryPage() {
  const queryClient = useQueryClient()
  const [appFilter, setAppFilter] = useState<string | undefined>(undefined)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [selectedDeploy, setSelectedDeploy] = useState<DeployHistoryEntry | null>(null)

  const {
    data: deployHistory,
    isLoading: historyLoading,
    error: historyError,
  } = useQuery({
    queryKey: ['deploy-history', appFilter, statusFilter],
    queryFn: () => fetchDeployHistory(appFilter, statusFilter),
    refetchInterval: 10000,
  })

  const {
    data: commits,
    isLoading: commitsLoading,
    error: commitsError,
  } = useQuery({
    queryKey: ['git-commits'],
    queryFn: fetchCommits,
  })

  if (historyLoading || commitsLoading) {
    return (
      <Box p="8" textAlign="center">
        <Spinner size="xl" colorPalette="brand" />
        <Text mt="4" color="fg.muted">
          Loading deploy history...
        </Text>
      </Box>
    )
  }

  if (historyError || commitsError) {
    return (
      <Box p="8">
        <Text color="red.500">Failed to load deploy history</Text>
      </Box>
    )
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'green'
      case 'failed':
        return 'red'
      case 'running':
        return 'blue'
      default:
        return 'gray'
    }
  }

  // Format duration
  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime).getTime()
    const end = endTime ? new Date(endTime).getTime() : Date.now()
    const duration = Math.floor((end - start) / 1000)

    const minutes = Math.floor(duration / 60)
    const seconds = duration % 60

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    }
    return `${seconds}s`
  }

  return (
    <>
      <Header />
      <Box p={{ base: '4', md: '8' }}>
        <HStack justify="space-between" mb="6" flexWrap="wrap" gap="2">
          <Heading>Deploy History</Heading>
          <HStack>
            <Button
              size="sm"
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['deploy-history'] })}
            >
              Refresh
            </Button>
            <Link href="/deploy">
              <Button size="sm" variant="outline">
                Back to Deploy
              </Button>
            </Link>
          </HStack>
        </HStack>

        {/* Filters */}
        <Box mb="6">
          <HStack gap="4" flexWrap="wrap">
            {/* App Filter */}
            <HStack gap="2">
              <Text fontSize="sm" color="fg.muted">
                App:
              </Text>
              <Button
                size="xs"
                variant={!appFilter ? 'solid' : 'outline'}
                colorPalette={!appFilter ? 'fg' : undefined}
                onClick={() => setAppFilter(undefined)}
              >
                All
              </Button>
              {KNOWN_APPS.map((app) => (
                <Button
                  key={app}
                  size="xs"
                  variant={appFilter === app ? 'solid' : 'outline'}
                  colorPalette={appFilter === app ? 'fg' : undefined}
                  onClick={() => setAppFilter(app)}
                >
                  {app}
                </Button>
              ))}
            </HStack>

            {/* Status Filter */}
            <HStack gap="2">
              <Text fontSize="sm" color="fg.muted">
                Status:
              </Text>
              <Button
                size="xs"
                variant={!statusFilter ? 'solid' : 'outline'}
                colorPalette={!statusFilter ? 'fg' : undefined}
                onClick={() => setStatusFilter(undefined)}
              >
                All
              </Button>
              <Button
                size="xs"
                variant={statusFilter === 'success' ? 'solid' : 'outline'}
                colorPalette={statusFilter === 'success' ? 'green' : undefined}
                onClick={() => setStatusFilter('success')}
              >
                Success
              </Button>
              <Button
                size="xs"
                variant={statusFilter === 'failed' ? 'solid' : 'outline'}
                colorPalette={statusFilter === 'failed' ? 'red' : undefined}
                onClick={() => setStatusFilter('failed')}
              >
                Failed
              </Button>
              <Button
                size="xs"
                variant={statusFilter === 'running' ? 'solid' : 'outline'}
                colorPalette={statusFilter === 'running' ? 'blue' : undefined}
                onClick={() => setStatusFilter('running')}
              >
                Running
              </Button>
            </HStack>
          </HStack>
        </Box>

        {/* Deploy History Entries */}
        <Box mb="8">
          <Heading size="md" mb="4">
            Deploy History
          </Heading>

          {deployHistory?.entries && deployHistory.entries.length > 0 ? (
            <VStack gap="3" align="stretch">
              {deployHistory.entries.map((entry) => (
                <Card.Root key={entry.id}>
                  <Card.Body>
                    <VStack align="start" gap="3">
                      <HStack justify="space-between" w="full" flexWrap="wrap" gap="2">
                        <HStack gap="2">
                          <Badge colorPalette={getStatusColor(entry.status)} size="sm">
                            {entry.status}
                          </Badge>
                          {entry.dryRun && (
                            <Badge colorPalette="yellow" size="sm">
                              Dry Run
                            </Badge>
                          )}
                          <Badge colorPalette="blue" size="sm" variant="outline">
                            {entry.app || 'all'}
                          </Badge>
                        </HStack>
                        <Text fontSize="xs" color="fg.muted" fontFamily="mono">
                          {entry.commitHash.substring(0, 7)}
                        </Text>
                      </HStack>

                      <Text fontWeight="medium" fontSize="sm">
                        {entry.commitMessage}
                      </Text>

                      <HStack fontSize="xs" color="fg.muted" flexWrap="wrap" gap="3">
                        <Text>Author: {entry.author}</Text>
                        <Text>Started: {formatDateTime(entry.startTime)}</Text>
                        <Text>Duration: {formatDuration(entry.startTime, entry.endTime)}</Text>
                        {entry.pid && <Text>PID: {entry.pid}</Text>}
                      </HStack>

                      {/* View Logs Button */}
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setSelectedDeploy(entry)}
                        disabled={!entry.logFile}
                      >
                        <LuFileText />
                        View Logs
                      </Button>
                    </VStack>
                  </Card.Body>
                </Card.Root>
              ))}
            </VStack>
          ) : (
            <Card.Root>
              <Card.Body>
                <Text color="fg.muted">
                  {appFilter || statusFilter
                    ? 'No deploys matching the filters'
                    : 'No deploy history yet. Start a deploy to see history here.'}
                </Text>
              </Card.Body>
            </Card.Root>
          )}
        </Box>

        {/* Last Legacy Deploy Info (backwards compat) */}
        {deployHistory?.history.lastCommit && (
          <Box mb="8">
            <Heading size="md" mb="4">
              Last Deploy (from file)
            </Heading>
            <Card.Root>
              <Card.Body>
                <VStack align="start" gap="3">
                  <HStack>
                    <Text fontWeight="medium">Commit:</Text>
                    <Text fontFamily="mono">{deployHistory.history.lastCommit}</Text>
                  </HStack>
                  {deployHistory.history.timestamp && (
                    <HStack>
                      <Text fontWeight="medium">Time:</Text>
                      <Text>{formatDateTime(deployHistory.history.timestamp)}</Text>
                    </HStack>
                  )}
                  {deployHistory.history.app && (
                    <HStack>
                      <Text fontWeight="medium">App:</Text>
                      <Text>{deployHistory.history.app}</Text>
                    </HStack>
                  )}
                </VStack>
              </Card.Body>
            </Card.Root>
          </Box>
        )}

        {/* Commit History */}
        <Box>
          <Heading size="md" mb="4">
            Recent Commits
          </Heading>
          <VStack gap="3" align="stretch">
            {commits?.commits.map((commit) => (
              <Card.Root key={commit.hash}>
                <Card.Body>
                  <VStack align="start" gap="2">
                    <HStack justify="space-between" w="full">
                      <Text fontWeight="bold">{commit.message}</Text>
                      <Text fontSize="xs" color="fg.muted" fontFamily="mono">
                        {commit.shortHash}
                      </Text>
                    </HStack>
                    <HStack fontSize="sm" color="fg.muted">
                      <Text>{commit.author}</Text>
                      <Text>•</Text>
                      <Text>{formatDateTime(commit.date)}</Text>
                    </HStack>
                  </VStack>
                </Card.Body>
              </Card.Root>
            ))}
          </VStack>

          {commits?.commits.length === 0 && (
            <Card.Root>
              <Card.Body>
                <Text color="fg.muted">No commits found</Text>
              </Card.Body>
            </Card.Root>
          )}
        </Box>
      </Box>

      {/* Deploy Logs Dialog */}
      {selectedDeploy && (
        <DeployLogsDialog
          deployId={selectedDeploy.id}
          logFile={selectedDeploy.logFile}
          open={!!selectedDeploy}
          onOpenChange={(open) => !open && setSelectedDeploy(null)}
        />
      )}
    </>
  )
}
