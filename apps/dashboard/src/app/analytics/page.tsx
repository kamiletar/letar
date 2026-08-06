'use client'

import { AddSiteDialog } from '@/app/_components/analytics/AddSiteDialog'
import { fetchEnvStatus, fetchPageViews, fetchSites } from '@/app/_components/analytics/api'
import { PageViewsCard } from '@/app/_components/analytics/PageViewsCard'
import { SiteCard } from '@/app/_components/analytics/SiteCard'
import { Box, Card, Heading, HStack, SimpleGrid, Spinner, Text } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'

export default function AnalyticsPage() {
  const {
    data: sites,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['analytics-sites'],
    queryFn: fetchSites,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })

  // Проверяем наличие env для всех сайтов по доменам (домен — общий ключ Umami ↔ DeployedApp)
  const { data: envStatus } = useQuery({
    queryKey: ['analytics-env-status', sites?.map((s) => s.domain).join(',')],
    queryFn: () => fetchEnvStatus(sites?.map((s) => s.domain) ?? []),
    enabled: !!sites && sites.length > 0,
    staleTime: 60 * 1000,
  })

  const { data: pageViews } = useQuery({
    queryKey: ['analytics-pageviews'],
    queryFn: fetchPageViews,
    staleTime: 60 * 1000,
  })

  if (error) {
    return (
      <Box p="8">
        <Text color="red.500">Ошибка подключения к Umami. Проверьте переменные UMAMI_API_* в .env.docker</Text>
      </Box>
    )
  }

  return (
    <Box p="8">
      <HStack justify="space-between" mb="6">
        <Heading>Аналитика</Heading>
        <AddSiteDialog />
      </HStack>

      <PageViewsCard data={pageViews} />

      {isLoading
        ? (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3, xl: 4 }} gap="4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card.Root key={i}>
                <Card.Body p="5">
                  <Spinner />
                </Card.Body>
              </Card.Root>
            ))}
          </SimpleGrid>
        )
        : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3, xl: 4 }} gap="4">
            {sites
              ?.toSorted((a, b) => a.name.localeCompare(b.name))
              .map((site) => <SiteCard key={site.id} site={site} envConfigured={envStatus?.[site.domain] ?? null} />)}
          </SimpleGrid>
        )}

      {sites?.length === 0 && (
        <Text color="fg.muted" textAlign="center" py="12">
          Нет сайтов. Добавьте первый сайт через кнопку выше.
        </Text>
      )}
    </Box>
  )
}
