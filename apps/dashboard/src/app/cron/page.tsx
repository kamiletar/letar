'use client'

import { controlScheduler, runCronJob, toggleCronJob } from '@/app/_actions/cron-actions'
import { Header } from '@/app/_components/layout/Header'
import { AppCardSkeleton, SkeletonGrid } from '@/app/_components/ui/skeletons'
import { Switch } from '@/app/_components/ui/switch'
import { toaster } from '@/app/_components/ui/toaster'
import { useServerContext } from '@/lib/contexts/ServerContext'
import { formatLastDeployed } from '@/lib/format'
import {
  Badge,
  Box,
  Button,
  Card,
  Heading,
  HStack,
  IconButton,
  SimpleGrid,
  Spinner,
  Table,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOptimistic, useState, useTransition } from 'react'
import { LuCheck, LuClock, LuLoader, LuPause, LuPencil, LuPlay, LuRefreshCw, LuX } from 'react-icons/lu'
import { CronHistoryDialog } from './_components/CronHistoryDialog'
import { CronScheduleDialog } from './_components/CronScheduleDialog'

interface CronJob {
  id: string
  name: string
  app: string
  endpoint: string
  schedule: string
  description: string
  enabled: boolean
}

interface CronJobStatus {
  job: CronJob
  lastRun: string | null
  lastStatus: 'success' | 'error' | 'running' | null
  lastError: string | null
  lastDuration: number | null
  nextRun: string | null
  isScheduled: boolean
}

interface JobsResponse {
  success: boolean
  isRunning: boolean
  scheduledCount: number
  totalCount: number
  jobs: CronJobStatus[]
}

async function fetchCronJobs(serverId: string | null): Promise<JobsResponse> {
  const url = serverId ? `/api/cron/jobs?serverId=${encodeURIComponent(serverId)}` : '/api/cron/jobs'
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('Failed to fetch cron jobs')
  }
  return res.json()
}

// Получение цвета для статуса
function getStatusColor(status: 'success' | 'error' | 'running' | null): string {
  switch (status) {
    case 'success':
      return 'green'
    case 'error':
      return 'red'
    case 'running':
      return 'blue'
    default:
      return 'gray'
  }
}

// Получение иконки для статуса
function StatusIcon({ status }: { status: 'success' | 'error' | 'running' | null }) {
  switch (status) {
    case 'success':
      return <LuCheck />
    case 'error':
      return <LuX />
    case 'running':
      return <LuLoader className="animate-spin" />
    default:
      return <LuClock />
  }
}

// Форматирование длительности
function formatDuration(ms: number | null): string {
  if (ms === null) {
    return '-'
  }
  if (ms < 1000) {
    return `${ms}ms`
  }
  return `${(ms / 1000).toFixed(1)}s`
}

// Получение цвета для приложения
function getAppColor(app: string): string {
  switch (app) {
    case 'premium-rosstil':
      return 'purple'
    case 'imot':
      return 'teal'
    case 'driving-school':
      return 'orange'
    case 'dashboard':
      return 'blue'
    case 'mandala':
      return 'pink'
    case 'kami':
      return 'cyan'
    default:
      return 'gray'
  }
}

export default function CronPage() {
  const { currentServer, isLoading: serverLoading } = useServerContext()
  const serverId = currentServer?.isLocal ? null : (currentServer?.id ?? null)
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()
  const [runningJobId, setRunningJobId] = useState<string | null>(null)
  const [historyJobId, setHistoryJobId] = useState<string | null>(null)
  const [editingJob, setEditingJob] = useState<{ id: string; name: string; schedule: string } | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['cron-jobs', serverId],
    queryFn: () => fetchCronJobs(serverId),
    refetchInterval: 5000,
    enabled: !serverLoading,
  })

  // Оптимистичное состояние для toggle
  const [optimisticJobs, setOptimisticJobs] = useOptimistic(
    data?.jobs ?? [],
    (state: CronJobStatus[], { jobId, enabled }: { jobId: string; enabled: boolean }) => {
      return state.map((item) =>
        item.job.id === jobId ? { ...item, job: { ...item.job, enabled }, isScheduled: enabled } : item
      )
    }
  )

  // Мутация для запуска задачи
  const runMutation = useMutation({
    mutationFn: async (jobId: string) => {
      setRunningJobId(jobId)
      const result = await runCronJob(jobId, serverId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to run job')
      }
      return result
    },
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: ['cron-jobs', serverId] })
      const job = data?.jobs.find((j) => j.job.id === jobId)
      toaster.create({
        title: 'Задача выполнена',
        description: job?.job.name,
        type: 'success',
      })
    },
    onError: (error: Error) => {
      toaster.create({
        title: 'Ошибка выполнения',
        description: error.message,
        type: 'error',
      })
    },
    onSettled: () => {
      setRunningJobId(null)
    },
  })

  // Обработчик toggle с useOptimistic
  const handleToggle = (jobId: string, currentEnabled: boolean) => {
    const newEnabled = !currentEnabled

    startTransition(async () => {
      // Оптимистичное обновление
      setOptimisticJobs({ jobId, enabled: newEnabled })

      const result = await toggleCronJob(jobId, newEnabled, serverId)

      if (!result.success) {
        toaster.create({
          title: 'Ошибка',
          description: result.error,
          type: 'error',
        })
        // Откатываем (данные обновятся при следующем refetch)
        queryClient.invalidateQueries({ queryKey: ['cron-jobs', serverId] })
      } else {
        queryClient.invalidateQueries({ queryKey: ['cron-jobs', serverId] })
        toaster.create({
          title: newEnabled ? 'Задача включена' : 'Задача отключена',
          type: 'success',
        })
      }
    })
  }

  // Управление планировщиком
  const schedulerMutation = useMutation({
    mutationFn: (action: 'start' | 'stop') => controlScheduler(action, serverId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['cron-jobs', serverId] })
      toaster.create({
        title: result.message,
        type: 'success',
      })
    },
    onError: (error: Error) => {
      toaster.create({
        title: 'Ошибка',
        description: error.message,
        type: 'error',
      })
    },
  })

  // Загрузка сервера
  if (serverLoading) {
    return (
      <>
        <Header />
        <Box p={{ base: '4', md: '8' }}>
          <Box textAlign="center" py="12">
            <Spinner size="xl" colorPalette="brand" />
            <Text mt="4" color="fg.muted">
              Загрузка...
            </Text>
          </Box>
        </Box>
      </>
    )
  }

  if (isLoading) {
    return (
      <>
        <Header />
        <Box p="8">
          <Heading mb="6">Cron Задачи</Heading>
          <SkeletonGrid count={3} columns={{ base: 1, md: 1, lg: 1 }} SkeletonComponent={AppCardSkeleton} />
        </Box>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Header />
        <Box p="8">
          <Text color="red.500">Ошибка загрузки cron задач</Text>
        </Box>
      </>
    )
  }

  const jobs = optimisticJobs.length > 0 ? optimisticJobs : (data?.jobs ?? [])
  const isRunning = data?.isRunning ?? false
  const scheduledCount = data?.scheduledCount ?? 0

  return (
    <>
      <Header />
      <Box p={{ base: '4', md: '8' }}>
        <HStack justify="space-between" mb="6" flexWrap="wrap" gap="2">
          <VStack align="start" gap="1">
            <Heading>Cron Задачи</Heading>
            <Text fontSize="sm" color="fg.muted">
              Управление и мониторинг фоновых задач
            </Text>
          </VStack>

          <HStack gap="2">
            <Badge colorPalette={isRunning ? 'green' : 'red'} size="lg">
              {isRunning ? `Активен (${scheduledCount})` : 'Остановлен'}
            </Badge>
            {isRunning ? (
              <Button
                size="sm"
                colorPalette="red"
                variant="outline"
                onClick={() => schedulerMutation.mutate('stop')}
                loading={schedulerMutation.isPending}
              >
                <LuPause />
                Остановить
              </Button>
            ) : (
              <Button
                size="sm"
                colorPalette="green"
                onClick={() => schedulerMutation.mutate('start')}
                loading={schedulerMutation.isPending}
              >
                <LuPlay />
                Запустить
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['cron-jobs', serverId] })}
            >
              <LuRefreshCw />
            </Button>
          </HStack>
        </HStack>

        {/* Статистика */}
        <SimpleGrid columns={{ base: 2, md: 4 }} gap="4" mb="6">
          <Card.Root>
            <Card.Body>
              <Text fontSize="sm" color="fg.muted">
                Всего задач
              </Text>
              <Text fontSize="2xl" fontWeight="bold">
                {jobs.length}
              </Text>
            </Card.Body>
          </Card.Root>
          <Card.Root>
            <Card.Body>
              <Text fontSize="sm" color="fg.muted">
                Активных
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="green.500">
                {jobs.filter((j) => j.job.enabled).length}
              </Text>
            </Card.Body>
          </Card.Root>
          <Card.Root>
            <Card.Body>
              <Text fontSize="sm" color="fg.muted">
                Успешных
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="green.500">
                {jobs.filter((j) => j.lastStatus === 'success').length}
              </Text>
            </Card.Body>
          </Card.Root>
          <Card.Root>
            <Card.Body>
              <Text fontSize="sm" color="fg.muted">
                С ошибками
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="red.500">
                {jobs.filter((j) => j.lastStatus === 'error').length}
              </Text>
            </Card.Body>
          </Card.Root>
        </SimpleGrid>

        {/* Таблица задач */}
        <Card.Root>
          <Card.Body p="0">
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Задача</Table.ColumnHeader>
                  <Table.ColumnHeader>Приложение</Table.ColumnHeader>
                  <Table.ColumnHeader>Расписание</Table.ColumnHeader>
                  <Table.ColumnHeader>Последний запуск</Table.ColumnHeader>
                  <Table.ColumnHeader>Статус</Table.ColumnHeader>
                  <Table.ColumnHeader>Активна</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Действия</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {jobs.map((item) => (
                  <Table.Row key={item.job.id}>
                    <Table.Cell>
                      <VStack align="start" gap="0">
                        <Text fontWeight="medium">{item.job.name}</Text>
                        <Text fontSize="xs" color="fg.muted">
                          {item.job.description}
                        </Text>
                      </VStack>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge colorPalette={getAppColor(item.job.app)} size="sm">
                        {item.job.app}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontFamily="mono" fontSize="sm">
                        {item.job.schedule}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <VStack align="start" gap="0">
                        <Text fontSize="sm">{formatLastDeployed(item.lastRun)}</Text>
                        {item.lastDuration !== null && (
                          <Text fontSize="xs" color="fg.muted">
                            {formatDuration(item.lastDuration)}
                          </Text>
                        )}
                      </VStack>
                    </Table.Cell>
                    <Table.Cell>
                      <HStack gap="1">
                        <Badge colorPalette={getStatusColor(item.lastStatus)} size="sm">
                          <StatusIcon status={item.lastStatus} />
                          {item.lastStatus || 'pending'}
                        </Badge>
                      </HStack>
                      {item.lastError && (
                        <Text fontSize="xs" color="red.500" maxW="200px" truncate>
                          {item.lastError}
                        </Text>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <Switch
                        checked={item.job.enabled}
                        onCheckedChange={() => handleToggle(item.job.id, item.job.enabled)}
                        disabled={isPending}
                      />
                    </Table.Cell>
                    <Table.Cell textAlign="right">
                      <HStack gap="1" justify="flex-end">
                        <IconButton
                          aria-label="Запустить"
                          size="xs"
                          variant="ghost"
                          colorPalette="green"
                          onClick={() => runMutation.mutate(item.job.id)}
                          loading={runningJobId === item.job.id}
                          disabled={runMutation.isPending}
                        >
                          <LuPlay />
                        </IconButton>
                        <IconButton
                          aria-label="Расписание"
                          size="xs"
                          variant="ghost"
                          colorPalette="blue"
                          onClick={() =>
                            setEditingJob({
                              id: item.job.id,
                              name: item.job.name,
                              schedule: item.job.schedule,
                            })
                          }
                        >
                          <LuPencil />
                        </IconButton>
                        <IconButton
                          aria-label="История"
                          size="xs"
                          variant="ghost"
                          onClick={() => setHistoryJobId(item.job.id)}
                        >
                          <LuClock />
                        </IconButton>
                      </HStack>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Card.Body>
        </Card.Root>

        {jobs.length === 0 && (
          <Box textAlign="center" py="12">
            <Text color="fg.muted">Нет настроенных cron задач</Text>
          </Box>
        )}
      </Box>

      {/* Диалог истории */}
      <CronHistoryDialog
        jobId={historyJobId}
        serverId={serverId}
        open={!!historyJobId}
        onOpenChange={(open) => !open && setHistoryJobId(null)}
      />

      {/* Диалог редактирования расписания */}
      <CronScheduleDialog
        jobId={editingJob?.id ?? null}
        jobName={editingJob?.name ?? ''}
        currentSchedule={editingJob?.schedule ?? ''}
        serverId={serverId}
        open={!!editingJob}
        onOpenChange={(open) => !open && setEditingJob(null)}
      />
    </>
  )
}
