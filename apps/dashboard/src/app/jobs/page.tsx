import { getDashboardJobStatuses } from '@/jobs/scheduler'
import { requireAdmin } from '@/lib/auth-utils'
import { Box, Heading, VStack } from '@chakra-ui/react'
import { JobsTable } from '@letar/admin-ui'
import { runJobNowAction, setJobEnabledAction } from './_actions/jobs.action'

export const metadata = { title: 'Задачи' }

export default async function JobsPage() {
  await requireAdmin()
  const jobs = await getDashboardJobStatuses()

  return (
    <Box p={{ base: '4', md: '8' }}>
      <VStack gap={6} align="stretch">
        <Heading size="lg">Задачи</Heading>
        <JobsTable jobs={jobs} onRunNow={runJobNowAction} onToggleEnabled={setJobEnabledAction} />
      </VStack>
    </Box>
  )
}
