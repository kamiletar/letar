'use client'

import { DockerNav } from '@/app/_components/docker/DockerNav'
import { Header } from '@/app/_components/layout/Header'
import { MetricCardSkeleton, SkeletonGrid } from '@/app/_components/ui/skeletons'
import { useServerContext } from '@/lib/contexts/ServerContext'
import { formatBytes, formatDateTime } from '@/lib/format'
import { Badge, Box, Button, Heading, HStack, Table, Text, VStack } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'

interface Volume {
  Name: string
  Driver: string
  Mountpoint: string
  CreatedAt: string
  Scope: string
  Labels: Record<string, string> | null
  UsageData?: {
    Size: number
    RefCount: number
  }
}

interface BindMount {
  Source: string
  Destination: string
  Mode: string
  RW: boolean
  ContainerName: string
  ContainerId: string
  ContainerState: string
}

interface VolumesResponse {
  volumes: Volume[]
  bindMounts: BindMount[]
}

async function fetchVolumes(serverId: string | null): Promise<VolumesResponse> {
  const params = new URLSearchParams()
  if (serverId) {
    params.set('serverId', serverId)
  }
  const url = params.size > 0 ? `/api/docker/volumes?${params}` : '/api/docker/volumes'
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('Failed to fetch volumes')
  }
  const data = await res.json()
  return {
    volumes: (data.volumes as Volume[]) ?? [],
    bindMounts: (data.bindMounts as BindMount[]) ?? [],
  }
}

export default function VolumesPage() {
  const { selectedServerId } = useServerContext()
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['docker-volumes', selectedServerId],
    queryFn: () => fetchVolumes(selectedServerId),
    refetchInterval: 30000,
  })

  if (isLoading) {
    return (
      <>
        <Header />
        <Box p="8">
          <DockerNav />
          <Heading mb="6">Docker Volumes</Heading>
          <SkeletonGrid count={3} columns={{ base: 1, md: 1, lg: 1 }} SkeletonComponent={MetricCardSkeleton} />
        </Box>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Header />
        <Box p="8">
          <DockerNav />
          <Text color="red.500">Failed to load volumes</Text>
        </Box>
      </>
    )
  }

  const volumes = data?.volumes || []
  const bindMounts = data?.bindMounts || []

  const totalSize = volumes.reduce((acc, v) => {
    const size = v.UsageData?.Size || 0
    return acc + (size > 0 ? size : 0)
  }, 0)

  return (
    <>
      <Header />
      <Box p="8">
        <DockerNav />
        <HStack justify="space-between" mb="6">
          <Heading>Docker Volumes</Heading>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Refresh
          </Button>
        </HStack>

        {/* Statistics */}
        <HStack gap="6" mb="6" fontSize="sm">
          <Box>
            <Text color="fg.muted">Docker Volumes</Text>
            <Text fontSize="2xl" fontWeight="bold">
              {volumes.length}
            </Text>
          </Box>
          <Box>
            <Text color="fg.muted">Bind Mounts</Text>
            <Text fontSize="2xl" fontWeight="bold">
              {bindMounts.length}
            </Text>
          </Box>
          <Box>
            <Text color="fg.muted">Total Size (Volumes)</Text>
            <Text fontSize="2xl" fontWeight="bold">
              {formatBytes(totalSize)}
            </Text>
          </Box>
        </HStack>

        <VStack gap="8" align="stretch">
          {/* Docker Volumes Table */}
          <Box>
            <Heading size="md" mb="4">
              Docker Volumes
            </Heading>
            {volumes.length > 0
              ? (
                <Box borderWidth="1px" borderRadius="lg" overflow="hidden">
                  <Table.Root size="sm">
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeader>Name</Table.ColumnHeader>
                        <Table.ColumnHeader>Driver</Table.ColumnHeader>
                        <Table.ColumnHeader>Size</Table.ColumnHeader>
                        <Table.ColumnHeader>Refs</Table.ColumnHeader>
                        <Table.ColumnHeader>Scope</Table.ColumnHeader>
                        <Table.ColumnHeader>Created</Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {volumes.map((volume) => (
                        <Table.Row key={volume.Name}>
                          <Table.Cell>
                            <Text fontFamily="mono" fontSize="sm" maxW="300px" truncate>
                              {volume.Name}
                            </Text>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge colorPalette="blue" size="sm">
                              {volume.Driver}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell>
                            {volume.UsageData?.Size !== undefined && volume.UsageData.Size >= 0
                              ? formatBytes(volume.UsageData.Size)
                              : 'N/A'}
                          </Table.Cell>
                          <Table.Cell>
                            {volume.UsageData?.RefCount !== undefined ? volume.UsageData.RefCount : 'N/A'}
                          </Table.Cell>
                          <Table.Cell>
                            <Badge colorPalette={volume.Scope === 'local' ? 'green' : 'purple'} size="sm">
                              {volume.Scope}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell>
                            <Text fontSize="sm" color="fg.muted">
                              {formatDateTime(volume.CreatedAt)}
                            </Text>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                </Box>
              )
              : (
                <Box textAlign="center" py="8" borderWidth="1px" borderRadius="lg">
                  <Text color="fg.muted">No Docker volumes found</Text>
                </Box>
              )}
          </Box>

          {/* Bind Mounts Table */}
          <Box>
            <Heading size="md" mb="4">
              Bind Mounts
            </Heading>
            {bindMounts.length > 0
              ? (
                <Box borderWidth="1px" borderRadius="lg" overflow="hidden">
                  <Table.Root size="sm">
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeader>Host Path</Table.ColumnHeader>
                        <Table.ColumnHeader>Container Path</Table.ColumnHeader>
                        <Table.ColumnHeader>Container</Table.ColumnHeader>
                        <Table.ColumnHeader>Mode</Table.ColumnHeader>
                        <Table.ColumnHeader>Status</Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {bindMounts.map((mount, index) => (
                        <Table.Row key={`${mount.ContainerId}-${mount.Destination}-${index}`}>
                          <Table.Cell>
                            <Text fontFamily="mono" fontSize="sm" maxW="300px" truncate title={mount.Source}>
                              {mount.Source}
                            </Text>
                          </Table.Cell>
                          <Table.Cell>
                            <Text fontFamily="mono" fontSize="sm" maxW="300px" truncate title={mount.Destination}>
                              {mount.Destination}
                            </Text>
                          </Table.Cell>
                          <Table.Cell>
                            <Text fontSize="sm" fontWeight="medium">
                              {mount.ContainerName}
                            </Text>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge colorPalette={mount.RW ? 'green' : 'orange'} size="sm">
                              {mount.RW ? 'rw' : 'ro'}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge colorPalette={mount.ContainerState === 'running' ? 'green' : 'gray'} size="sm">
                              {mount.ContainerState}
                            </Badge>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                </Box>
              )
              : (
                <Box textAlign="center" py="8" borderWidth="1px" borderRadius="lg">
                  <Text color="fg.muted">No bind mounts found</Text>
                </Box>
              )}
          </Box>
        </VStack>
      </Box>
    </>
  )
}
