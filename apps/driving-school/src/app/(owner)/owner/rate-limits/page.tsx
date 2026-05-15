import { prisma } from '@/lib/db'
import { Box, Heading, Text } from '@chakra-ui/react'

import { RateLimitsClient } from './_components/rate-limits'

export const metadata = {
  title: 'API Rate Limiting',
  description: 'Настройка лимитов запросов к Public API',
}

async function getOrganizations() {
  return prisma.organization.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: 'asc' },
  })
}

export default async function RateLimitsPage() {
  const organizations = await getOrganizations()

  return (
    <>
      {/* Заголовок */}
      <Box>
        <Heading size="xl">API Rate Limiting</Heading>
        <Text color="fg.muted" mt={2}>
          Управление лимитами запросов к Public API для организаций
        </Text>
      </Box>

      {/* Клиентский компонент с настройками */}
      <RateLimitsClient organizations={organizations} />
    </>
  )
}
