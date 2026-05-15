'use client'

import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from '@/app/_components/ui/dialog'
import { formatBytes, formatDateTime } from '@/lib/format'
import { Badge, Box, Code, HStack, Spinner, Tabs, Text, VStack } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'

interface ContainerInspectDialogProps {
  containerId: string
  containerName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface InspectData {
  id: string
  name: string
  created: string
  state: {
    status: string
    running: boolean
    paused: boolean
    restarting: boolean
    oomKilled: boolean
    dead: boolean
    pid: number
    exitCode: number
    error: string
    startedAt: string
    finishedAt: string
  }
  image: {
    id: string
    name: string
  }
  config: {
    hostname: string
    domainname: string
    user: string
    workingDir: string
    entrypoint: string[] | null
    cmd: string[] | null
    env: string[]
    labels: Record<string, string>
    exposedPorts: Record<string, object>
  }
  network: {
    hostname: string
    ports: Record<string, Array<{ HostIp: string; HostPort: string }> | null>
    networks: Array<{
      name: string
      ipAddress: string
      gateway: string
      macAddress: string
    }>
  }
  mounts: Array<{
    type: string
    source: string
    destination: string
    mode: string
    rw: boolean
  }>
  hostConfig: {
    binds: string[] | null
    memory: number
    memorySwap: number
    cpuShares: number
    cpuPeriod: number
    cpuQuota: number
    restartPolicy: { Name: string; MaximumRetryCount: number }
    networkMode: string
    privileged: boolean
    publishAllPorts: boolean
  }
  platform: string
  driver: string
  path: string
  args: string[]
}

async function fetchContainerInspect(containerId: string) {
  const res = await fetch(`/api/docker/containers/${containerId}/inspect`)
  if (!res.ok) {
    throw new Error('Failed to fetch container info')
  }
  const data = await res.json()
  return data.inspect as InspectData
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <HStack justify="space-between" py="1" borderBottomWidth="1px" borderColor="border.muted">
      <Text fontSize="sm" color="fg.muted" minW="120px">
        {label}
      </Text>
      <Box flex="1" textAlign="right">
        {typeof value === 'string' ? (
          <Text fontSize="sm" fontFamily="mono">
            {value || '-'}
          </Text>
        ) : (
          value
        )}
      </Box>
    </HStack>
  )
}

export function ContainerInspectDialog({
  containerId,
  containerName,
  open,
  onOpenChange,
}: ContainerInspectDialogProps) {
  const {
    data: inspect,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['container-inspect', containerId],
    queryFn: () => fetchContainerInspect(containerId),
    enabled: open,
  })

  // Проверка Docker zero-date (Go формат)
  const formatDockerDate = (dateStr: string) =>
    !dateStr || dateStr.startsWith('0001-01-01') ? '-' : formatDateTime(dateStr)

  return (
    <DialogRoot open={open} onOpenChange={(e) => onOpenChange(e.open)} size="xl" placement="center">
      <DialogContent maxW="900px" maxH="80vh">
        <DialogHeader>
          <DialogTitle>Inspect: {containerName}</DialogTitle>
          <DialogCloseTrigger />
        </DialogHeader>
        <DialogBody pb="6" overflow="auto">
          {isLoading ? (
            <HStack justify="center" py="8">
              <Spinner size="sm" />
              <Text color="fg.muted">Loading...</Text>
            </HStack>
          ) : error ? (
            <Text color="red.400">Error: {error instanceof Error ? error.message : 'Failed to load info'}</Text>
          ) : inspect ? (
            <Tabs.Root defaultValue="general" variant="line">
              <Tabs.List mb="4">
                <Tabs.Trigger value="general">General</Tabs.Trigger>
                <Tabs.Trigger value="network">Network</Tabs.Trigger>
                <Tabs.Trigger value="mounts">Mounts</Tabs.Trigger>
                <Tabs.Trigger value="config">Config</Tabs.Trigger>
                <Tabs.Trigger value="env">Environment</Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="general">
                <VStack align="stretch" gap="0">
                  <InfoRow label="Container ID" value={inspect.id.substring(0, 12)} />
                  <InfoRow label="Name" value={inspect.name} />
                  <InfoRow
                    label="Status"
                    value={
                      <Badge colorPalette={inspect.state.running ? 'green' : 'red'} size="sm">
                        {inspect.state.status}
                      </Badge>
                    }
                  />
                  <InfoRow label="PID" value={String(inspect.state.pid || '-')} />
                  <InfoRow label="Created" value={formatDockerDate(inspect.created)} />
                  <InfoRow label="Started" value={formatDockerDate(inspect.state.startedAt)} />
                  <InfoRow label="Finished" value={formatDockerDate(inspect.state.finishedAt)} />
                  <InfoRow label="Exit Code" value={String(inspect.state.exitCode)} />
                  <InfoRow label="Image" value={inspect.image.name} />
                  <InfoRow label="Image ID" value={inspect.image.id.substring(0, 19)} />
                  <InfoRow label="Platform" value={inspect.platform || '-'} />
                  <InfoRow label="Driver" value={inspect.driver} />
                  <InfoRow
                    label="Restart Policy"
                    value={`${inspect.hostConfig.restartPolicy?.Name || '-'} (max: ${
                      inspect.hostConfig.restartPolicy?.MaximumRetryCount || 0
                    })`}
                  />
                  {inspect.hostConfig.memory > 0 && (
                    <InfoRow label="Memory Limit" value={formatBytes(inspect.hostConfig.memory)} />
                  )}
                  <InfoRow
                    label="Privileged"
                    value={
                      <Badge colorPalette={inspect.hostConfig.privileged ? 'red' : 'gray'} size="sm">
                        {inspect.hostConfig.privileged ? 'Yes' : 'No'}
                      </Badge>
                    }
                  />
                </VStack>
              </Tabs.Content>

              <Tabs.Content value="network">
                <VStack align="stretch" gap="4">
                  <Box>
                    <Text fontWeight="medium" mb="2">
                      Networks
                    </Text>
                    {inspect.network.networks.length > 0 ? (
                      <VStack align="stretch" gap="0">
                        {inspect.network.networks.map((net) => (
                          <Box key={net.name} p="3" bg="bg.muted" borderRadius="md" mb="2">
                            <Text fontWeight="medium" mb="1">
                              {net.name}
                            </Text>
                            <InfoRow label="IP Address" value={net.ipAddress || '-'} />
                            <InfoRow label="Gateway" value={net.gateway || '-'} />
                            <InfoRow label="MAC Address" value={net.macAddress || '-'} />
                          </Box>
                        ))}
                      </VStack>
                    ) : (
                      <Text color="fg.muted" fontSize="sm">
                        No networks
                      </Text>
                    )}
                  </Box>

                  <Box>
                    <Text fontWeight="medium" mb="2">
                      Port Mappings
                    </Text>
                    {inspect.network.ports && Object.keys(inspect.network.ports).length > 0 ? (
                      <VStack align="stretch" gap="0">
                        {Object.entries(inspect.network.ports).map(([port, bindings]) => (
                          <InfoRow
                            key={port}
                            label={port}
                            value={
                              bindings
                                ? bindings.map((b) => `${b.HostIp || '0.0.0.0'}:${b.HostPort}`).join(', ')
                                : 'Not bound'
                            }
                          />
                        ))}
                      </VStack>
                    ) : (
                      <Text color="fg.muted" fontSize="sm">
                        No port mappings
                      </Text>
                    )}
                  </Box>

                  <InfoRow label="Network Mode" value={inspect.hostConfig.networkMode} />
                  <InfoRow label="Hostname" value={inspect.config.hostname} />
                </VStack>
              </Tabs.Content>

              <Tabs.Content value="mounts">
                <VStack align="stretch" gap="2">
                  {inspect.mounts && inspect.mounts.length > 0 ? (
                    inspect.mounts.map((mount) => (
                      <Box key={mount.destination} p="3" bg="bg.muted" borderRadius="md">
                        <HStack mb="2">
                          <Badge colorPalette="blue" size="sm">
                            {mount.type}
                          </Badge>
                          <Badge colorPalette={mount.rw ? 'green' : 'yellow'} size="sm">
                            {mount.rw ? 'RW' : 'RO'}
                          </Badge>
                        </HStack>
                        <InfoRow label="Source" value={mount.source} />
                        <InfoRow label="Destination" value={mount.destination} />
                        {mount.mode && <InfoRow label="Mode" value={mount.mode} />}
                      </Box>
                    ))
                  ) : (
                    <Text color="fg.muted" fontSize="sm">
                      No mounts
                    </Text>
                  )}

                  {inspect.hostConfig.binds && inspect.hostConfig.binds.length > 0 && (
                    <Box mt="4">
                      <Text fontWeight="medium" mb="2">
                        Binds
                      </Text>
                      <VStack align="stretch" gap="1">
                        {inspect.hostConfig.binds.map((bind) => (
                          <Code key={bind} fontSize="xs" p="2">
                            {bind}
                          </Code>
                        ))}
                      </VStack>
                    </Box>
                  )}
                </VStack>
              </Tabs.Content>

              <Tabs.Content value="config">
                <VStack align="stretch" gap="0">
                  <InfoRow label="Working Dir" value={inspect.config.workingDir || '/'} />
                  <InfoRow label="User" value={inspect.config.user || 'root'} />
                  {inspect.config.entrypoint && (
                    <InfoRow
                      label="Entrypoint"
                      value={<Code fontSize="xs">{inspect.config.entrypoint.join(' ')}</Code>}
                    />
                  )}
                  {inspect.config.cmd && (
                    <InfoRow label="Command" value={<Code fontSize="xs">{inspect.config.cmd.join(' ')}</Code>} />
                  )}
                  <InfoRow label="Path" value={inspect.path} />
                  {inspect.args && inspect.args.length > 0 && (
                    <InfoRow label="Args" value={<Code fontSize="xs">{inspect.args.join(' ')}</Code>} />
                  )}

                  {inspect.config.labels && Object.keys(inspect.config.labels).length > 0 && (
                    <Box mt="4">
                      <Text fontWeight="medium" mb="2">
                        Labels
                      </Text>
                      <VStack align="stretch" gap="0">
                        {Object.entries(inspect.config.labels).map(([key, value]) => (
                          <InfoRow key={key} label={key} value={value} />
                        ))}
                      </VStack>
                    </Box>
                  )}
                </VStack>
              </Tabs.Content>

              <Tabs.Content value="env">
                <VStack align="stretch" gap="1">
                  {inspect.config.env && inspect.config.env.length > 0 ? (
                    inspect.config.env.map((envVar) => {
                      const [envKey, ...valueParts] = envVar.split('=')
                      const value = valueParts.join('=')
                      const isSecret =
                        envKey.toLowerCase().includes('password') ||
                        envKey.toLowerCase().includes('secret') ||
                        envKey.toLowerCase().includes('key') ||
                        envKey.toLowerCase().includes('token')
                      return (
                        <Box key={envKey} p="2" bg="bg.muted" borderRadius="md">
                          <Text fontSize="sm" fontWeight="medium" color="fg.muted">
                            {envKey}
                          </Text>
                          <Code fontSize="xs" wordBreak="break-all">
                            {isSecret ? '********' : value}
                          </Code>
                        </Box>
                      )
                    })
                  ) : (
                    <Text color="fg.muted" fontSize="sm">
                      No environment variables
                    </Text>
                  )}
                </VStack>
              </Tabs.Content>
            </Tabs.Root>
          ) : null}
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  )
}
