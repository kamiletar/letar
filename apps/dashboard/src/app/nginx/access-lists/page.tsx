'use client'

import { deleteAccessListAction } from '@/app/_actions/npm-actions'
import { Header } from '@/app/_components/layout/Header'
import { AccessListCard } from '@/app/_components/nginx/AccessListCard'
import { NginxNav } from '@/app/_components/nginx/NginxNav'
import { toaster } from '@/app/_components/ui/toaster'
import type { NpmAccessList } from '@/lib/npm'
import { Box, Button, Heading, HStack, SimpleGrid, Spinner, Text } from '@chakra-ui/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTransition } from 'react'

async function fetchAccessLists() {
  const res = await fetch('/api/nginx/access-lists')
  if (!res.ok) {
    throw new Error('Failed to fetch access lists')
  }
  const data = await res.json()
  return data.data as NpmAccessList[]
}

async function fetchNpmStatus() {
  const res = await fetch('/api/nginx/status')
  if (!res.ok) {
    return { status: 'error' as const }
  }
  return res.json()
}

export default function AccessListsPage() {
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()

  // Статус подключения к NPM
  const { data: npmStatus } = useQuery({
    queryKey: ['npm-status'],
    queryFn: fetchNpmStatus,
    refetchInterval: 30000,
  })

  // Список access lists
  const {
    data: accessLists,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['npm-access-lists'],
    queryFn: fetchAccessLists,
    refetchInterval: 30000,
    enabled: npmStatus?.status === 'healthy',
  })

  // Обработчик Delete
  const handleDelete = (accessListId: number) => {
    startTransition(async () => {
      const result = await deleteAccessListAction(accessListId)

      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['npm-access-lists'] })
        toaster.create({
          title: 'Access list deleted',
          type: 'success',
        })
      } else {
        toaster.create({
          title: 'Failed to delete access list',
          description: result.error,
          type: 'error',
        })
      }
    })
  }

  // Статус NPM не подключён
  if (npmStatus?.status === 'error') {
    return (
      <>
        <Header />
        <Box p={{ base: '4', md: '8' }}>
          <NginxNav />
          <Box textAlign="center" py="12">
            <Text color="red.500" fontSize="lg" fontWeight="medium" mb="2">
              Nginx Proxy Manager недоступен
            </Text>
            <Text color="fg.muted" mb="4">
              {npmStatus.error || 'Проверьте подключение и настройки NPM_API_URL'}
            </Text>
            <Button
              size="sm"
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['npm-status'] })}
            >
              Retry
            </Button>
          </Box>
        </Box>
      </>
    )
  }

  if (isLoading) {
    return (
      <>
        <Header />
        <Box p={{ base: '4', md: '8' }}>
          <NginxNav />
          <Box textAlign="center" py="12">
            <Spinner size="xl" colorPalette="brand" />
            <Text mt="4" color="fg.muted">
              Loading access lists...
            </Text>
          </Box>
        </Box>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Header />
        <Box p={{ base: '4', md: '8' }}>
          <NginxNav />
          <Box textAlign="center" py="12">
            <Text color="red.500">Failed to load access lists</Text>
          </Box>
        </Box>
      </>
    )
  }

  // Сортируем access lists по имени
  const sortedAccessLists = [...(accessLists ?? [])].sort((a, b) => {
    return a.name.localeCompare(b.name)
  })

  // Считаем используемые
  const usedCount = sortedAccessLists.filter((al) => (al.proxy_host_count || 0) > 0).length

  return (
    <>
      <Header />
      <Box p={{ base: '4', md: '8' }}>
        <NginxNav />
        <HStack justify="space-between" mb="6" flexWrap="wrap" gap="2">
          <Heading>Access Lists</Heading>
          <HStack>
            <Button
              size="sm"
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['npm-access-lists'] })}
              disabled={isPending}
            >
              Refresh
            </Button>
          </HStack>
        </HStack>

        {/* Statistics */}
        <HStack gap={{ base: '4', md: '6' }} mb="6" fontSize="sm" flexWrap="wrap">
          <Box>
            <Text color="fg.muted">Total</Text>
            <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold">
              {sortedAccessLists.length}
            </Text>
          </Box>
          <Box>
            <Text color="fg.muted">In Use</Text>
            <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" color="blue.500">
              {usedCount}
            </Text>
          </Box>
          <Box>
            <Text color="fg.muted">Unused</Text>
            <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" color="gray.500">
              {sortedAccessLists.length - usedCount}
            </Text>
          </Box>
        </HStack>

        {/* Access lists grid */}
        {sortedAccessLists.length > 0 ? (
          <SimpleGrid columns={{ base: 1, lg: 2, xl: 3 }} gap="6">
            {sortedAccessLists.map((accessList) => (
              <AccessListCard
                key={accessList.id}
                accessList={accessList}
                onDelete={() => handleDelete(accessList.id)}
              />
            ))}
          </SimpleGrid>
        ) : (
          <Box textAlign="center" py="12">
            <Text color="fg.muted">No access lists found</Text>
          </Box>
        )}
      </Box>
    </>
  )
}
