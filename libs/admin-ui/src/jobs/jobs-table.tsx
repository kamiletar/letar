'use client'

import { Alert, Badge, Box, Button, HStack, Stack, Switch, Table, Text } from '@chakra-ui/react'
import { useState, useTransition } from 'react'
import type { JobStatusItem } from './job-status-item'

const STATE_LABELS: Record<NonNullable<JobStatusItem['lastRunState']>, { label: string; color: string }> = {
  completed: { label: 'Успешно', color: 'green' },
  failed: { label: 'Ошибка', color: 'red' },
  active: { label: 'Выполняется', color: 'blue' },
  retry: { label: 'Повтор', color: 'orange' },
  created: { label: 'В очереди', color: 'gray' },
  cancelled: { label: 'Отменена', color: 'gray' },
}

function formatDateTime(date: Date | null): string {
  if (!date) {
    return '—'
  }
  return new Date(date).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDurationMs(ms: number | null): string {
  if (ms === null) {
    return '—'
  }
  return ms < 1000 ? `${ms} мс` : `${(ms / 1000).toFixed(1)} с`
}

export interface JobsTableProps {
  jobs: JobStatusItem[]
  /** Ставит задачу в очередь немедленно — кнопка «Запустить сейчас». */
  onRunNow: (jobId: string) => Promise<void>
  /** Переключатель «включена/выключена» — записывает оверрайд и применяет его сразу. */
  onToggleEnabled: (jobId: string, enabled: boolean) => Promise<void>
}

/**
 * Таблица крон-задач приложения (`@letar/jobs`, PLAN-INFRA §75) — расписание, последний и
 * следующий запуск, ручной перезапуск, включение/выключение без редеплоя. Презентационный
 * компонент: структура данных совпадает с `JobStatus` из `@letar/jobs`, но зависимости на эту
 * библиотеку у `@letar/admin-ui` нет — см. `job-status-item.ts`.
 */
export function JobsTable({ jobs, onRunNow, onToggleEnabled }: JobsTableProps) {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleRunNow = (jobId: string) => {
    setPendingId(jobId)
    startTransition(async () => {
      await onRunNow(jobId)
      setPendingId(null)
    })
  }

  const handleToggle = (jobId: string, enabled: boolean) => {
    setPendingId(jobId)
    startTransition(async () => {
      await onToggleEnabled(jobId, enabled)
      setPendingId(null)
    })
  }

  // Флаг одинаков для всех задач процесса — берём по первой, но требуем непустой список.
  const autoScheduleOff = jobs.length > 0 && !jobs[0].autoSchedule

  return (
    <Stack gap={4}>
      {autoScheduleOff && (
        <Alert.Root status="warning">
          <Alert.Indicator />
          <Box>
            <Alert.Title>Расписание не тикает</Alert.Title>
            <Alert.Description>
              Планировщик запущен без автотика: очереди и обработчики зарегистрированы, поэтому «Запустить сейчас»
              работает, но сами задачи не срабатывают. Включается переменной окружения{' '}
              <Text as="span" fontFamily="mono">JOBS_ENABLED=true</Text>{' '}
              — в dev это нормально, на проде значит, что задачи не выполняет никто.
            </Alert.Description>
          </Box>
        </Alert.Root>
      )}
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Задача</Table.ColumnHeader>
            <Table.ColumnHeader>Расписание</Table.ColumnHeader>
            <Table.ColumnHeader>Последний запуск</Table.ColumnHeader>
            <Table.ColumnHeader>Следующий запуск</Table.ColumnHeader>
            <Table.ColumnHeader>Вкл.</Table.ColumnHeader>
            <Table.ColumnHeader />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {jobs.map((job) => {
            const state = job.lastRunState ? STATE_LABELS[job.lastRunState] : null
            const rowPending = isPending && pendingId === job.id

            return (
              <Table.Row key={job.id} opacity={rowPending ? 0.6 : 1}>
                <Table.Cell>
                  <Text fontWeight="medium">{job.name}</Text>
                  <Text fontSize="sm" color="fg.muted">
                    {job.description}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <HStack gap={2}>
                    <Text fontFamily="mono" fontSize="sm">
                      {job.schedule}
                    </Text>
                    {job.hasOverride && (
                      <Badge colorPalette="purple" size="sm">
                        оверрайд
                      </Badge>
                    )}
                  </HStack>
                </Table.Cell>
                <Table.Cell>
                  <HStack gap={2}>
                    <Text fontSize="sm">{formatDateTime(job.lastRunAt)}</Text>
                    {state && (
                      <Badge colorPalette={state.color} size="sm" title={job.lastRunError ?? undefined}>
                        {state.label}
                      </Badge>
                    )}
                  </HStack>
                  {job.lastRunState === 'completed' && (
                    <Text fontSize="xs" color="fg.muted">
                      {formatDurationMs(job.lastRunDurationMs)}
                    </Text>
                  )}
                  {job.lastRunError && (
                    <Text fontSize="xs" color="red.fg">
                      {job.lastRunError}
                    </Text>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <Text fontSize="sm">{job.enabled ? formatDateTime(job.nextRunAt) : '—'}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Switch.Root
                    checked={job.enabled}
                    disabled={rowPending}
                    onCheckedChange={(details) => handleToggle(job.id, details.checked)}
                  >
                    <Switch.HiddenInput />
                    <Switch.Control />
                  </Switch.Root>
                </Table.Cell>
                <Table.Cell>
                  <Button size="sm" variant="outline" disabled={rowPending} onClick={() => handleRunNow(job.id)}>
                    Запустить сейчас
                  </Button>
                </Table.Cell>
              </Table.Row>
            )
          })}
        </Table.Body>
      </Table.Root>
    </Stack>
  )
}
