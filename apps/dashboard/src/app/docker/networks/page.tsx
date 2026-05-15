'use client'

import { DockerNav } from '@/app/_components/docker/DockerNav'
import { Header } from '@/app/_components/layout/Header'
import { MetricCardSkeleton, SkeletonGrid } from '@/app/_components/ui/skeletons'
import { useServerContext } from '@/lib/contexts/ServerContext'
import { formatDateTime } from '@/lib/format'
import { Badge, Box, Button, Heading, HStack, Table, Text, VStack } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'

interface Network {
  Id: string
  Name: string
  Driver: string
  Scope: string
  Internal: boolean
  IPAM: {
    Config: Array<{
      Subnet?: string
      Gateway?: string
    }>
  }
  Containers: Record<string, { Name: string; IPv4Address: string }>
  Created: string
}

async function fetchNetworks(serverId: string | null) {
  const params = new URLSearchParams()
  if (serverId) {
    params.set('serverId', serverId)
  }
  const url = params.size > 0 ? `/api/docker/networks?${params}` : '/api/docker/networks'
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('Failed to fetch networks')
  }
  const data = await res.json()
  return data.networks as Network[]
}

export default function NetworksPage() {
  const { selectedServerId } = useServerContext()
  const {
    data: networks,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['docker-networks', selectedServerId],
    queryFn: () => fetchNetworks(selectedServerId),
    refetchInterval: 30000,
  })

  if (isLoading) {
    return (
      <>
        <Header />
        <Box p="8">
          <DockerNav />
          <Heading mb="6">Docker Networks</Heading>
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
          <Text color="red.500">Failed to load networks</Text>
        </Box>
      </>
    )
  }

  // Sort: custom networks first, then system networks
  const sortedNetworks = [...(networks || [])].sort((a, b) => {
    const systemNetworks = ['bridge', 'host', 'none']
    const aIsSystem = systemNetworks.includes(a.Name)
    const bIsSystem = systemNetworks.includes(b.Name)
    if (aIsSystem && !bIsSystem) {
      return 1
    }
    if (!aIsSystem && bIsSystem) {
      return -1
    }
    return a.Name.localeCompare(b.Name)
  })

  const customNetworks = sortedNetworks.filter((n) => !['bridge', 'host', 'none'].includes(n.Name))

  return (
    <>
      <Header />
      <Box p="8">
        <DockerNav />
        <HStack justify="space-between" mb="6">
          <Heading>Docker Networks</Heading>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Refresh
          </Button>
        </HStack>

        {/* Statistics */}
        <HStack gap="6" mb="6" fontSize="sm">
          <Box>
            <Text color="fg.muted">Total Networks</Text>
            <Text fontSize="2xl" fontWeight="bold">
              {networks?.length || 0}
            </Text>
          </Box>
          <Box>
            <Text color="fg.muted">Custom Networks</Text>
            <Text fontSize="2xl" fontWeight="bold" color="blue.500">
              {customNetworks.length}
            </Text>
          </Box>
        </HStack>

        {/* Networks Table */}
        {sortedNetworks.length > 0 ? (
          <Box borderWidth="1px" borderRadius="lg" overflow="hidden">
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Name</Table.ColumnHeader>
                  <Table.ColumnHeader>Driver</Table.ColumnHeader>
                  <Table.ColumnHeader>Scope</Table.ColumnHeader>
                  <Table.ColumnHeader>Subnet</Table.ColumnHeader>
                  <Table.ColumnHeader>Containers</Table.ColumnHeader>
                  <Table.ColumnHeader>Created</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {sortedNetworks.map((network) => {
                  const containerCount = Object.keys(network.Containers || {}).length
                  const subnet = network.IPAM?.Config?.[0]?.Subnet || 'N/A'
                  const isSystem = ['bridge', 'host', 'none'].includes(network.Name)

                  return (
                    <Table.Row key={network.Id}>
                      <Table.Cell>
                        <HStack>
                          <Text fontFamily="mono" fontSize="sm">
                            {network.Name}
                          </Text>
                          {isSystem && (
                            <Badge colorPalette="gray" size="sm">
                              system
                            </Badge>
                          )}
                          {network.Internal && (
                            <Badge colorPalette="orange" size="sm">
                              internal
                            </Badge>
                          )}
                        </HStack>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge
                          colorPalette={
                            network.Driver === 'bridge' ? 'blue' : network.Driver === 'overlay' ? 'purple' : 'gray'
                          }
                          size="sm"
                        >
                          {network.Driver}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge colorPalette={network.Scope === 'local' ? 'green' : 'purple'} size="sm">
                          {network.Scope}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontFamily="mono" fontSize="sm">
                          {subnet}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        {containerCount > 0 ? (
                          <VStack align="start" gap="1">
                            <Badge colorPalette="green" size="sm">
                              {containerCount} connected
                            </Badge>
                          </VStack>
                        ) : (
                          <Text color="fg.muted" fontSize="sm">
                            0
                          </Text>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontSize="sm" color="fg.muted">
                          {formatDateTime(network.Created)}
                        </Text>
                      </Table.Cell>
                    </Table.Row>
                  )
                })}
              </Table.Body>
            </Table.Root>
          </Box>
        ) : (
          <Box textAlign="center" py="12">
            <Text color="fg.muted">No networks found</Text>
          </Box>
        )}
      </Box>
    </>
  )
}
