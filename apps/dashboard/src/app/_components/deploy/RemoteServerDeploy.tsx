'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { DeployLogDialog } from '@/app/servers/_components/DeployLogDialog'
import type { ServerInfoWithApps } from '@/lib/contexts/ServerContext'
import { formatLastDeployed } from '@/lib/format'
import type { GitIncomingResponse, GitStatusResponse } from '@/lib/server-client/types'
import {
  Badge,
  Box,
  Button,
  Card,
  Heading,
  HStack,
  IconButton,
  Separator,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOptimistic, useState, useTransition } from 'react'
import { LuGitPullRequest, LuRefreshCw, LuRocket } from 'react-icons/lu'

// =============================================================================
// Types
// =============================================================================

interface Props {
  server: ServerInfoWithApps
}

type PullAction = { type: 'pull' }

// =============================================================================
// Component
// =============================================================================

export function RemoteServerDeploy({ server }: Props) {
  const queryClient = useQueryClient()
  const [deployingAppId, setDeployingAppId] = useState<string | null>(null)
  const [deployingAll, setDeployingAll] = useState(false)
  const [isPulling, startPullTransition] = useTransition()

  // Deploy dialog state
  const [deployDialog, setDeployDialog] = useState<{
    isOpen: boolean
    appId: string
    appName: string
  } | null>(null)

  // Используем приложения из пропсов (уже загружены в ServerContext)
  const apps = server.apps || []

  // Git status query
  const { data: gitStatus, isLoading: gitLoading } = useQuery({
    queryKey: ['git-status', server.id],
    queryFn: async (): Promise<GitStatusResponse> => {
      const res = await fetch(`/api/servers/${server.id}/git/status`)
      if (!res.ok) {
        return { success: false, error: 'Failed to fetch' }
      }
      return res.json()
    },
    refetchInterval: 30000,
  })

  // Git incoming query
  const { data: incomingCommits, isFetching: incomingFetching } = useQuery({
    queryKey: ['git-incoming', server.id],
    queryFn: async (): Promise<GitIncomingResponse> => {
      const res = await fetch(`/api/servers/${server.id}/git/incoming`)
      if (!res.ok) {
        return { success: false, error: 'Failed to fetch' }
      }
      return res.json()
    },
    refetchInterval: 60000,
  })

  // Оптимистичное состояние для incoming commits
  const [optimisticIncoming, setOptimisticIncoming] = useOptimistic(
    incomingCommits,
    (state: GitIncomingResponse | undefined, _action: PullAction) => {
      return state ? { ...state, count: 0, commits: [] } : state
    }
  )

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['servers'] })
    queryClient.invalidateQueries({ queryKey: ['git-status', server.id] })
    queryClient.invalidateQueries({ queryKey: ['git-incoming', server.id] })
  }

  // Git Pull handler
  const handlePull = () => {
    startPullTransition(async () => {
      setOptimisticIncoming({ type: 'pull' })

      try {
        const res = await fetch(`/api/servers/${server.id}/git/pull`, { method: 'POST' })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to pull')
        }
        const data = await res.json()

        toaster.create({
          title: data.upToDate ? 'Уже актуально' : 'Git Pull успешен',
          description: data.output || 'Изменения подтянуты',
          type: 'success',
        })
        refetch()
      } catch (error) {
        queryClient.invalidateQueries({ queryKey: ['git-incoming', server.id] })
        toaster.create({
          title: 'Ошибка Git Pull',
          description: error instanceof Error ? error.message : 'Unknown error',
          type: 'error',
        })
      }
    })
  }

  // Мутация для деплоя одного приложения
  const deployAppMutation = useMutation({
    mutationFn: async (appId: string) => {
      const res = await fetch(`/api/servers/${server.id}/apps/${appId}/deploy`, {
        method: 'POST',
      })
      if (!res.ok) {
        let errorMsg = `HTTP ${res.status}: ${res.statusText}`
        try {
          const error = await res.json()
          errorMsg = error.error || errorMsg
        } catch {
          // Ответ не JSON
        }
        throw new Error(errorMsg)
      }
      return res.json()
    },
    onSuccess: (data, appId) => {
      queryClient.invalidateQueries({ queryKey: ['server-apps', server.id] })
      queryClient.invalidateQueries({ queryKey: ['servers'] })
      const app = apps.find((a) => a.id === appId)
      toaster.create({
        title: `Деплой ${app?.displayName || 'приложения'} выполнен`,
        description: data.logs?.join('\n'),
        type: 'success',
      })
    },
    onError: (error, appId) => {
      const app = apps.find((a) => a.id === appId)
      toaster.create({
        title: `Ошибка деплоя ${app?.displayName || 'приложения'}`,
        description: error.message,
        type: 'error',
      })
    },
  })

  // Деплой одного приложения — открываем диалог с логами
  const handleDeployApp = (appId: string) => {
    const app = apps.find((a) => a.id === appId)
    const appName = app?.displayName || app?.name || 'Unknown'

    setDeployDialog({
      isOpen: true,
      appId,
      appName,
    })
  }

  const handleDeployComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['servers'] })
    queryClient.invalidateQueries({ queryKey: ['server-apps', server.id] })
  }

  const handleCloseDeployDialog = () => {
    setDeployDialog(null)
  }

  // Деплой всех приложений
  const handleDeployAll = async () => {
    const deployableApps = apps.filter((app) => app.containerName)
    if (deployableApps.length === 0) {
      return
    }

    setDeployingAll(true)
    let successCount = 0
    let errorCount = 0

    for (const app of deployableApps) {
      setDeployingAppId(app.id)
      try {
        await deployAppMutation.mutateAsync(app.id)
        successCount++
      } catch {
        errorCount++
      }
    }

    setDeployingAppId(null)
    setDeployingAll(false)

    toaster.create({
      title: 'Деплой завершён',
      description: `Успешно: ${successCount}, Ошибок: ${errorCount}`,
      type: errorCount > 0 ? 'warning' : 'success',
    })
  }

  const deployableAppsCount = apps.filter((app) => app.containerName).length
  const displayIncoming = optimisticIncoming ?? incomingCommits
  const incomingCount = displayIncoming?.count ?? 0

  return (
    <Box>
      {/* Заголовок и действия */}
      <HStack justify="space-between" mb="6" flexWrap="wrap" gap="2">
        <VStack align="start" gap="1">
          <Heading size="md">Приложения на {server.displayName}</Heading>
          <Text fontSize="sm" color="fg.muted">
            {server.host}:{server.port}
          </Text>
        </VStack>
        <HStack gap="2">
          <Button size="sm" variant="outline" colorPalette="green" onClick={handlePull} loading={isPulling}>
            <LuGitPullRequest />
            Git Pull
          </Button>
          <IconButton aria-label="Обновить" size="sm" variant="outline" onClick={() => refetch()}>
            <LuRefreshCw />
          </IconButton>
          {deployableAppsCount > 0 && (
            <Button colorPalette="green" onClick={handleDeployAll} loading={deployingAll} disabled={deployingAll}>
              <LuRocket />
              Деплой всех ({deployableAppsCount})
            </Button>
          )}
        </HStack>
      </HStack>

      {/* Incoming Commits */}
      {incomingCount > 0 && (
        <Box mb="6" opacity={isPulling ? 0.7 : 1} transition="opacity 0.2s">
          <Card.Root borderColor="green.500" borderWidth="2px">
            <Card.Body position="relative">
              {isPulling && (
                <Box position="absolute" top={4} right={4}>
                  <Spinner size="sm" color="green.400" />
                </Box>
              )}
              <HStack justify="space-between" mb="4" flexWrap="wrap" gap="2">
                <HStack flexWrap="wrap" gap="2">
                  <Badge colorPalette="green" size="lg">
                    {incomingCount} новых коммитов
                  </Badge>
                  <Text color="fg.muted" fontSize="sm">
                    {isPulling ? 'подтягиваются...' : 'доступны на remote'}
                  </Text>
                </HStack>
                <Button colorPalette="green" onClick={handlePull} loading={isPulling}>
                  <LuGitPullRequest />
                  {isPulling ? 'Pulling...' : 'Git Pull'}
                </Button>
              </HStack>

              <VStack align="start" gap="2" maxH="200px" overflowY="auto">
                {displayIncoming?.commits?.map((commit) => (
                  <HStack key={commit.hash} fontSize="sm" gap="3">
                    <Text fontFamily="mono" color="green.400">
                      {commit.shortHash}
                    </Text>
                    <Text truncate maxW="400px" title={commit.message}>
                      {commit.message}
                    </Text>
                    <Text color="fg.muted" fontSize="xs">
                      {commit.author}
                    </Text>
                  </HStack>
                ))}
              </VStack>
            </Card.Body>
          </Card.Root>
        </Box>
      )}

      {/* Git Status — компактная строка */}
      {gitStatus?.success && gitStatus.status && (
        <Card.Root mb="6">
          <Card.Body py="3">
            <HStack gap="4" flexWrap="wrap" fontSize="sm">
              <HStack>
                <Text color="fg.muted">Branch:</Text>
                <Badge colorPalette="blue">{gitStatus.status.current}</Badge>
              </HStack>

              <Separator orientation="vertical" height="4" display={{ base: 'none', md: 'block' }} />

              <HStack>
                <Text color="fg.muted">Status:</Text>
                <Badge colorPalette={gitStatus.status.isClean ? 'green' : 'yellow'}>
                  {gitStatus.status.isClean ? 'Clean ✓' : 'Modified'}
                </Badge>
                {!gitStatus.status.isClean && (
                  <Text color="fg.muted" fontSize="xs">
                    (
                    {(gitStatus.status.modified?.length ?? 0) +
                      (gitStatus.status.created?.length ?? 0) +
                      (gitStatus.status.deleted?.length ?? 0)}{' '}
                    files)
                  </Text>
                )}
                {isPulling && <Spinner size="xs" color="green.400" />}
              </HStack>

              <Separator orientation="vertical" height="4" display={{ base: 'none', md: 'block' }} />

              {gitStatus.currentCommit && (
                <HStack flex="1" minW="0">
                  <Text fontFamily="mono" color="brand.400" flexShrink={0}>
                    {gitStatus.currentCommit.shortHash}
                  </Text>
                  <Text color="fg.muted">—</Text>
                  <Text truncate title={gitStatus.currentCommit.message}>
                    {gitStatus.currentCommit.message}
                  </Text>
                </HStack>
              )}

              {(gitLoading || incomingFetching) && <Spinner size="xs" />}
            </HStack>
          </Card.Body>
        </Card.Root>
      )}

      {/* Список приложений */}
      {apps.length === 0 ? (
        <Card.Root>
          <Card.Body>
            <Text color="fg.muted" textAlign="center">
              На сервере нет приложений. Добавьте их в разделе "Серверы".
            </Text>
          </Card.Body>
        </Card.Root>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap="4">
          {apps.map((app) => (
            <Card.Root key={app.id}>
              <Card.Body>
                <VStack align="stretch" gap="3">
                  <HStack justify="space-between">
                    <VStack align="start" gap="0">
                      <Text fontWeight="bold">{app.displayName}</Text>
                      <Text fontSize="xs" color="fg.muted">
                        {app.name}
                      </Text>
                    </VStack>
                    <Badge colorPalette={app.type === 'WEB' ? 'blue' : 'gray'} size="sm">
                      {app.type}
                    </Badge>
                  </HStack>

                  {app.containerName && (
                    <HStack fontSize="sm">
                      <Text color="fg.muted">Контейнер:</Text>
                      <Text fontFamily="mono">{app.containerName}</Text>
                    </HStack>
                  )}

                  {app.port && (
                    <HStack fontSize="sm">
                      <Text color="fg.muted">Порт:</Text>
                      <Text>{app.port}</Text>
                    </HStack>
                  )}

                  <HStack fontSize="sm">
                    <Text color="fg.muted">Последний деплой:</Text>
                    <Text>{formatLastDeployed(app.lastDeployed)}</Text>
                  </HStack>

                  {app.containerName ? (
                    <Button
                      colorPalette="green"
                      size="sm"
                      onClick={() => handleDeployApp(app.id)}
                      loading={deployingAppId === app.id}
                      disabled={deployingAll || deployingAppId !== null}
                    >
                      <LuRocket />
                      Деплой
                    </Button>
                  ) : (
                    <Text fontSize="xs" color="fg.muted" textAlign="center">
                      Контейнер не указан
                    </Text>
                  )}
                </VStack>
              </Card.Body>
            </Card.Root>
          ))}
        </SimpleGrid>
      )}

      {/* Deploy Log Dialog */}
      {deployDialog && (
        <DeployLogDialog
          isOpen={deployDialog.isOpen}
          serverId={server.id}
          appId={deployDialog.appId}
          appName={deployDialog.appName}
          onClose={handleCloseDeployDialog}
          onDeployComplete={handleDeployComplete}
        />
      )}
    </Box>
  )
}
