'use client'

import type { WorkflowRun } from '@/lib/github-actions'
import { Badge, Card, Link as ChakraLink, Heading, HStack, Icon, Spinner, Text, VStack } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { LuCircleCheck, LuCircleX, LuExternalLink, LuLoaderCircle, LuMinus } from 'react-icons/lu'

async function fetchWorkflowRuns(): Promise<WorkflowRun[]> {
  const response = await fetch('/api/github/workflow-runs')
  if (!response.ok) {
    throw new Error('Не удалось получить статус CI')
  }
  const { data } = await response.json()
  return data
}

/** Цвет и иконка по статусу/результату запуска */
function runStatus(run: WorkflowRun): { colorPalette: string; icon: React.ReactNode; label: string } {
  if (run.status === 'in_progress' || run.status === 'queued' || run.status === 'waiting') {
    return { colorPalette: 'blue', icon: <LuLoaderCircle />, label: 'выполняется' }
  }
  switch (run.conclusion) {
    case 'success':
      return { colorPalette: 'green', icon: <LuCircleCheck />, label: 'успешно' }
    case 'failure':
    case 'timed_out':
      return { colorPalette: 'red', icon: <LuCircleX />, label: 'ошибка' }
    case 'cancelled':
    case 'skipped':
      return { colorPalette: 'gray', icon: <LuMinus />, label: 'отменено' }
    default:
      return { colorPalette: 'gray', icon: <LuMinus />, label: run.conclusion ?? 'неизвестно' }
  }
}

/** Карточка со статусом последних запусков GitHub Actions для letar */
export function GithubActionsCard() {
  const {
    data: runs,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['github-workflow-runs'],
    queryFn: fetchWorkflowRuns,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  })

  return (
    <Card.Root>
      <Card.Body>
        <HStack justify="space-between" mb="4">
          <Heading size="md">GitHub Actions</Heading>
          <ChakraLink
            href="https://github.com/kamiletar/letar/actions"
            target="_blank"
            rel="noopener noreferrer"
            fontSize="xs"
            color="brand.fg"
            _hover={{ textDecoration: 'underline' }}
          >
            <HStack gap="1">
              <Text>Все запуски</Text>
              <Icon size="xs">
                <LuExternalLink />
              </Icon>
            </HStack>
          </ChakraLink>
        </HStack>

        {isLoading && (
          <HStack justify="center" py="6">
            <Spinner size="md" color="brand.solid" />
          </HStack>
        )}

        {isError && (
          <Text fontSize="sm" color="fg.muted">
            Не удалось загрузить статус CI
          </Text>
        )}

        {runs && runs.length === 0 && (
          <Text fontSize="sm" color="fg.muted">
            Запусков не найдено
          </Text>
        )}

        {runs && runs.length > 0 && (
          <VStack gap="2" align="stretch">
            {runs.map((run) => {
              const status = runStatus(run)
              return (
                <ChakraLink
                  key={run.id}
                  href={run.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  _hover={{ textDecoration: 'none', bg: 'bg.muted' }}
                  borderRadius="md"
                  px="2"
                  py="1.5"
                >
                  <HStack justify="space-between" gap="3">
                    <HStack gap="2" minW="0">
                      <Icon color={`${status.colorPalette}.500`} flexShrink="0">
                        {status.icon}
                      </Icon>
                      <VStack gap="0" align="start" minW="0">
                        <Text fontSize="sm" fontWeight="medium" lineClamp={1}>
                          {run.displayTitle}
                        </Text>
                        <Text fontSize="xs" color="fg.muted">
                          {run.name} · {run.headBranch}
                        </Text>
                      </VStack>
                    </HStack>
                    <VStack gap="1" align="end" flexShrink="0">
                      <Badge colorPalette={status.colorPalette} size="sm">
                        {status.label}
                      </Badge>
                      <Text fontSize="xs" color="fg.muted">
                        {new Date(run.updatedAt).toLocaleString('ru-RU')}
                      </Text>
                    </VStack>
                  </HStack>
                </ChakraLink>
              )
            })}
          </VStack>
        )}
      </Card.Body>
    </Card.Root>
  )
}
