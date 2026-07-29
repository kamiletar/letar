'use client'

import { deleteCertificateAction } from '@/app/_actions/npm-actions'
import { Header } from '@/app/_components/layout/Header'
import { CertificateCard } from '@/app/_components/nginx/CertificateCard'
import { NginxNav } from '@/app/_components/nginx/NginxNav'
import { toaster } from '@/app/_components/ui/toaster'
import type { NpmCertificate } from '@/lib/nginx-proxy-manager'
import { Box, Button, Heading, HStack, SimpleGrid, Spinner, Text } from '@chakra-ui/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTransition } from 'react'

async function fetchCertificates() {
  const res = await fetch('/api/nginx/certificates')
  if (!res.ok) {
    throw new Error('Failed to fetch certificates')
  }
  const data = await res.json()
  return data.data as NpmCertificate[]
}

async function fetchNpmStatus() {
  const res = await fetch('/api/nginx/status')
  if (!res.ok) {
    return { status: 'error' as const }
  }
  return res.json()
}

export default function CertificatesPage() {
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()

  // Статус подключения к NPM
  const { data: npmStatus } = useQuery({
    queryKey: ['npm-status'],
    queryFn: fetchNpmStatus,
    refetchInterval: 30000,
  })

  // Список сертификатов
  const {
    data: certificates,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['npm-certificates'],
    queryFn: fetchCertificates,
    refetchInterval: 30000,
    enabled: npmStatus?.status === 'healthy',
  })

  // Обработчик Delete
  const handleDelete = (certificateId: number) => {
    startTransition(async () => {
      const result = await deleteCertificateAction(certificateId)

      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['npm-certificates'] })
        toaster.create({
          title: 'Certificate deleted',
          type: 'success',
        })
      } else {
        toaster.create({
          title: 'Failed to delete certificate',
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
              Loading certificates...
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
            <Text color="red.500">Failed to load certificates</Text>
          </Box>
        </Box>
      </>
    )
  }

  // Сортируем сертификаты по дате истечения
  const sortedCertificates = [...(certificates ?? [])].sort((a, b) => {
    return new Date(a.expires_on).getTime() - new Date(b.expires_on).getTime()
  })

  // Считаем истекающие
  const now = new Date()
  const expiringCount = sortedCertificates.filter((c) => {
    const expiresDate = new Date(c.expires_on)
    const daysUntilExpiry = Math.ceil((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0
  }).length

  const expiredCount = sortedCertificates.filter((c) => {
    return new Date(c.expires_on) < now
  }).length

  return (
    <>
      <Header />
      <Box p={{ base: '4', md: '8' }}>
        <NginxNav />
        <HStack justify="space-between" mb="6" flexWrap="wrap" gap="2">
          <Heading>SSL Certificates</Heading>
          <HStack>
            <Button
              size="sm"
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['npm-certificates'] })}
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
              {sortedCertificates.length}
            </Text>
          </Box>
          <Box>
            <Text color="fg.muted">Expiring Soon</Text>
            <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" color="yellow.500">
              {expiringCount}
            </Text>
          </Box>
          <Box>
            <Text color="fg.muted">Expired</Text>
            <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" color="red.500">
              {expiredCount}
            </Text>
          </Box>
        </HStack>

        {/* Certificates grid */}
        {sortedCertificates.length > 0 ? (
          <SimpleGrid columns={{ base: 1, lg: 2, xl: 3 }} gap="6">
            {sortedCertificates.map((certificate) => (
              <CertificateCard
                key={certificate.id}
                certificate={certificate}
                onDelete={() => handleDelete(certificate.id)}
              />
            ))}
          </SimpleGrid>
        ) : (
          <Box textAlign="center" py="12">
            <Text color="fg.muted">No certificates found</Text>
          </Box>
        )}
      </Box>
    </>
  )
}
