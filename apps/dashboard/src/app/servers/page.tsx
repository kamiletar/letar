'use client'

/**
 * Страница управления серверами и приложениями
 */

import { Header } from '@/app/_components/layout/Header'
import { toaster } from '@/app/_components/ui/toaster'
import type { ServerInfo } from '@/lib/server-client'
import { Accordion, Badge, Box, Button, Heading, HStack, IconButton, Spinner, Text, VStack } from '@chakra-ui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { LuPencil, LuPlus, LuScan, LuTrash2 } from 'react-icons/lu'
import { checkServerHealth, discoverApps, fetchServers } from './_api'
import { AppForm, AppsTable, DeployLogDialog, DiscoveredApps, HealthBadge, ServerForm } from './_components'
import {
  type AppFormData,
  type DeployedApp,
  type DiscoveredApp,
  emptyAppForm,
  emptyServerForm,
  type ServerFormData,
} from './_types'

export default function ServersPage() {
  const queryClient = useQueryClient()

  // Server state
  const [isAddingServer, setIsAddingServer] = useState(false)
  const [editingServerId, setEditingServerId] = useState<string | null>(null)
  const [serverForm, setServerForm] = useState<ServerFormData>(emptyServerForm)
  const [healthStatus, setHealthStatus] = useState<Record<string, boolean | null>>({})

  // App state
  const [addingAppServerId, setAddingAppServerId] = useState<string | null>(null)
  const [editingAppId, setEditingAppId] = useState<string | null>(null)
  const [appForm, setAppForm] = useState<AppFormData>(emptyAppForm)
  const [discoveredApps, setDiscoveredApps] = useState<Record<string, DiscoveredApp[]>>({})
  const [isDiscovering, setIsDiscovering] = useState<Record<string, boolean>>({})
  const [deployingAppId] = useState<string | null>(null)

  // Deploy dialog state
  const [deployDialog, setDeployDialog] = useState<
    {
      isOpen: boolean
      serverId: string
      appId: string
      appName: string
    } | null
  >(null)

  // Fetch servers
  const { data: servers = [], isLoading } = useQuery({
    queryKey: ['servers'],
    queryFn: fetchServers,
  })

  // =============================================================================
  // Server Mutations
  // =============================================================================

  const createServerMutation = useMutation({
    mutationFn: async (data: ServerFormData) => {
      const res = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create server')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] })
      setIsAddingServer(false)
      setServerForm(emptyServerForm)
      toaster.create({ title: 'Сервер добавлен', type: 'success' })
    },
    onError: (error) => {
      toaster.create({ title: 'Ошибка', description: error.message, type: 'error' })
    },
  })

  const updateServerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ServerFormData> }) => {
      const res = await fetch(`/api/servers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update server')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] })
      setEditingServerId(null)
      setServerForm(emptyServerForm)
      toaster.create({ title: 'Сервер обновлён', type: 'success' })
    },
    onError: (error) => {
      toaster.create({ title: 'Ошибка', description: error.message, type: 'error' })
    },
  })

  const deleteServerMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/servers/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete server')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] })
      toaster.create({ title: 'Сервер удалён', type: 'success' })
    },
    onError: (error) => {
      toaster.create({ title: 'Ошибка', description: error.message, type: 'error' })
    },
  })

  // =============================================================================
  // App Mutations
  // =============================================================================

  const createAppMutation = useMutation({
    mutationFn: async ({ serverId, data }: { serverId: string; data: AppFormData }) => {
      const res = await fetch(`/api/servers/${serverId}/apps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          port: data.port ? parseInt(data.port) : null,
        }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create app')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] })
      setAddingAppServerId(null)
      setAppForm(emptyAppForm)
      toaster.create({ title: 'Приложение добавлено', type: 'success' })
    },
    onError: (error) => {
      toaster.create({ title: 'Ошибка', description: error.message, type: 'error' })
    },
  })

  const updateAppMutation = useMutation({
    mutationFn: async ({ serverId, appId, data }: { serverId: string; appId: string; data: AppFormData }) => {
      const res = await fetch(`/api/servers/${serverId}/apps/${appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          port: data.port ? parseInt(data.port) : null,
        }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update app')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] })
      setEditingAppId(null)
      setAppForm(emptyAppForm)
      toaster.create({ title: 'Приложение обновлено', type: 'success' })
    },
    onError: (error) => {
      toaster.create({ title: 'Ошибка', description: error.message, type: 'error' })
    },
  })

  const deleteAppMutation = useMutation({
    mutationFn: async ({ serverId, appId }: { serverId: string; appId: string }) => {
      const res = await fetch(`/api/servers/${serverId}/apps/${appId}`, { method: 'DELETE' })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete app')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] })
      toaster.create({ title: 'Приложение удалено', type: 'success' })
    },
    onError: (error) => {
      toaster.create({ title: 'Ошибка', description: error.message, type: 'error' })
    },
  })

  // =============================================================================
  // Handlers
  // =============================================================================

  const handleCheckHealth = async (server: ServerInfo) => {
    setHealthStatus((prev) => ({ ...prev, [server.id]: null }))
    const isHealthy = await checkServerHealth(server)
    setHealthStatus((prev) => ({ ...prev, [server.id]: isHealthy }))
  }

  const handleEditServer = (server: ServerInfo) => {
    setEditingServerId(server.id)
    setServerForm({
      name: server.name,
      displayName: server.displayName,
      host: server.host,
      port: server.port,
      isLocal: server.isLocal,
      agentToken: server.agentToken || '',
      npmUrl: server.npmUrl || '',
      npmEmail: server.npmEmail || '',
      npmPassword: '', // Пароль не загружается из API — вводится только при изменении
    })
  }

  const handleCancelServer = () => {
    setIsAddingServer(false)
    setEditingServerId(null)
    setServerForm(emptyServerForm)
  }

  const handleSaveServer = () => {
    if (editingServerId) {
      // Не отправлять пустые секреты — они не должны сбрасывать существующие значения
      const { agentToken, npmPassword, ...rest } = serverForm
      const data = {
        ...rest,
        ...(agentToken && { agentToken }), // Только если заполнен
        ...(npmPassword && { npmPassword }), // Только если заполнен
      }
      updateServerMutation.mutate({ id: editingServerId, data })
    } else {
      createServerMutation.mutate(serverForm)
    }
  }

  const handleDeleteServer = (id: string) => {
    if (confirm('Удалить сервер?')) {
      deleteServerMutation.mutate(id)
    }
  }

  const handleDiscoverApps = async (serverId: string) => {
    setIsDiscovering((prev) => ({ ...prev, [serverId]: true }))
    try {
      const apps = await discoverApps(serverId)
      setDiscoveredApps((prev) => ({ ...prev, [serverId]: apps }))
    } catch (error) {
      toaster.create({
        title: 'Ошибка сканирования',
        description: error instanceof Error ? error.message : 'Unknown error',
        type: 'error',
      })
    } finally {
      setIsDiscovering((prev) => ({ ...prev, [serverId]: false }))
    }
  }

  const handleAddDiscoveredApp = (serverId: string, app: DiscoveredApp) => {
    setAddingAppServerId(serverId)
    setAppForm({
      name: app.name,
      displayName: app.displayName,
      containerName: app.containerName,
      port: app.port?.toString() || '',
      type: 'WEB',
      imageName: app.imageName,
    })
  }

  const handleEditApp = (serverId: string, app: DeployedApp) => {
    setAddingAppServerId(serverId)
    setEditingAppId(app.id)
    setAppForm({
      name: app.name,
      displayName: app.displayName,
      containerName: app.containerName || '',
      port: app.port?.toString() || '',
      type: app.type,
      imageName: app.imageName || '',
    })
  }

  const handleCancelApp = () => {
    setAddingAppServerId(null)
    setEditingAppId(null)
    setAppForm(emptyAppForm)
  }

  const handleSaveApp = (serverId: string) => {
    if (editingAppId) {
      updateAppMutation.mutate({ serverId, appId: editingAppId, data: appForm })
    } else {
      createAppMutation.mutate({ serverId, data: appForm })
    }
  }

  const handleDeleteApp = (serverId: string, appId: string) => {
    if (confirm('Удалить приложение?')) {
      deleteAppMutation.mutate({ serverId, appId })
    }
  }

  const handleDeployApp = (serverId: string, appId: string) => {
    // Находим приложение для получения имени
    const server = servers.find((s) => s.id === serverId)
    const app = server?.apps?.find((a) => a.id === appId)
    const appName = app?.displayName || app?.name || 'Unknown'

    // Открываем диалог с логами
    setDeployDialog({
      isOpen: true,
      serverId,
      appId,
      appName,
    })
  }

  const handleDeployComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['servers'] })
  }

  const handleCloseDeployDialog = () => {
    setDeployDialog(null)
  }

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <>
      <Header />
      <Box p={{ base: '4', md: '8' }}>
        <HStack justify="space-between" mb="6">
          <Heading>Серверы</Heading>
          {!isAddingServer && (
            <Button
              colorPalette="fg"
              onClick={() => {
                setIsAddingServer(true)
                setServerForm(emptyServerForm)
              }}
            >
              <LuPlus />
              Добавить сервер
            </Button>
          )}
        </HStack>

        <VStack gap="6" align="stretch">
          {/* Server Form */}
          {(isAddingServer || editingServerId) && (
            <ServerForm
              form={serverForm}
              isEditing={!!editingServerId}
              isSaving={createServerMutation.isPending || updateServerMutation.isPending}
              onFormChange={setServerForm}
              onSave={handleSaveServer}
              onCancel={handleCancelServer}
            />
          )}

          {/* Servers List with Apps */}
          {isLoading
            ? (
              <Box p="8" textAlign="center">
                <Spinner size="lg" />
              </Box>
            )
            : servers.length === 0
            ? (
              <Box p="8" textAlign="center">
                <Text color="fg.muted">Нет серверов</Text>
              </Box>
            )
            : (
              <Accordion.Root multiple defaultValue={servers.map((s) => s.id)}>
                {servers.map((server) => (
                  <Accordion.Item key={server.id} value={server.id}>
                    <Accordion.ItemTrigger>
                      <HStack flex="1" justify="space-between" pr="4">
                        <HStack gap="3">
                          <Box>
                            <Text fontWeight="medium">{server.displayName}</Text>
                            <Text fontSize="xs" color="fg.muted">
                              {server.name}
                            </Text>
                          </Box>
                          <HealthBadge
                            server={server}
                            status={healthStatus[server.id]}
                            onCheck={() => handleCheckHealth(server)}
                          />
                        </HStack>
                        <HStack gap="2">
                          <Text fontSize="sm" fontFamily="mono" color="fg.muted">
                            {server.host}:{server.port}
                          </Text>
                          <Badge colorPalette="gray">{server.apps?.length || 0} прил.</Badge>
                          <HStack gap="1" onClick={(e) => e.stopPropagation()}>
                            <IconButton
                              aria-label="Редактировать"
                              size="xs"
                              variant="ghost"
                              onClick={() => handleEditServer(server)}
                            >
                              <LuPencil />
                            </IconButton>
                            {!server.isLocal && (
                              <IconButton
                                aria-label="Удалить"
                                size="xs"
                                variant="ghost"
                                colorPalette="red"
                                onClick={() => handleDeleteServer(server.id)}
                              >
                                <LuTrash2 />
                              </IconButton>
                            )}
                          </HStack>
                        </HStack>
                      </HStack>
                      <Accordion.ItemIndicator />
                    </Accordion.ItemTrigger>
                    <Accordion.ItemContent>
                      <Box p="4" bg="bg.subtle" borderRadius="md">
                        {/* App Actions */}
                        <HStack justify="space-between" mb="4">
                          <Text fontWeight="medium">Приложения</Text>
                          <HStack gap="2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDiscoverApps(server.id)}
                              loading={isDiscovering[server.id]}
                            >
                              <LuScan />
                              Сканировать
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                setAddingAppServerId(server.id)
                                setEditingAppId(null)
                                setAppForm(emptyAppForm)
                              }}
                            >
                              <LuPlus />
                              Добавить
                            </Button>
                          </HStack>
                        </HStack>

                        {/* Discovered Apps */}
                        <DiscoveredApps
                          apps={discoveredApps[server.id] || []}
                          onAddApp={(app) => handleAddDiscoveredApp(server.id, app)}
                        />

                        {/* App Form */}
                        {addingAppServerId === server.id && (
                          <AppForm
                            form={appForm}
                            isEditing={!!editingAppId}
                            isSaving={createAppMutation.isPending || updateAppMutation.isPending}
                            onFormChange={setAppForm}
                            onSave={() => handleSaveApp(server.id)}
                            onCancel={handleCancelApp}
                          />
                        )}

                        {/* Apps Table */}
                        <AppsTable
                          apps={server.apps || []}
                          deployingAppId={deployingAppId}
                          onEdit={(app) => handleEditApp(server.id, app)}
                          onDelete={(appId) => handleDeleteApp(server.id, appId)}
                          onDeploy={(appId) => handleDeployApp(server.id, appId)}
                        />
                      </Box>
                    </Accordion.ItemContent>
                  </Accordion.Item>
                ))}
              </Accordion.Root>
            )}
        </VStack>
      </Box>

      {/* Deploy Log Dialog */}
      {deployDialog && (
        <DeployLogDialog
          isOpen={deployDialog.isOpen}
          serverId={deployDialog.serverId}
          appId={deployDialog.appId}
          appName={deployDialog.appName}
          onClose={handleCloseDeployDialog}
          onDeployComplete={handleDeployComplete}
        />
      )}
    </>
  )
}
