'use client'

import { type DepPackageRow, DepsPackageTable } from '@/app/_components/deps/DepsPackageTable'
import { DepsStalenessBanner } from '@/app/_components/deps/DepsStalenessBanner'
import { DepsSummaryCards } from '@/app/_components/deps/DepsSummaryCards'
import { Box, Heading, Text } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'

// ⛔ На этой странице нет и не будет кнопок «bun update» / «обновить всё» / «обновить пакет» —
// обновление зависимостей делает человек руками, система только докладывает (§25 PLAN-INFRA.md).

interface DepScanResponse {
  success: boolean
  scan: {
    id: string
    scannedAt: string
    riskScore: number
    outdatedCount: number
    majorCount: number
    minorCount: number
    patchCount: number
    vulnCritical: number
    vulnHigh: number
    vulnModerate: number
    vulnLow: number
    lockfileUpdatedAt: string | null
    packages: DepPackageRow[]
  } | null
}

async function fetchLatestScan(): Promise<DepScanResponse> {
  const res = await fetch('/api/deps/latest')
  if (!res.ok) {
    throw new Error('Failed to fetch latest deps scan')
  }
  return res.json()
}

export default function DepsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['deps', 'latest'],
    queryFn: fetchLatestScan,
    // Данные меняются раз в неделю — чаще незачем
    refetchInterval: 60_000,
  })

  const scan = data?.scan ?? null

  return (
    <Box p={{ base: '4', md: '8' }}>
      <Heading mb="1">Зависимости</Heading>
      <Text color="fg.muted" mb="6">
        Еженедельный контроль устаревших и уязвимых пакетов монорепо
      </Text>

      {error && (
        <Text color="red.500" mb="6">
          Не удалось загрузить данные
        </Text>
      )}

      {!error && scan === null && !isLoading && (
        <Text color="fg.muted" mb="6">
          Скан ни разу не запускался. Выполните{' '}
          <Text asChild fontFamily="mono">
            <span>bun scripts/deps-scan.ts</span>
          </Text>{' '}
          на машине разработчика.
        </Text>
      )}

      <DepsStalenessBanner
        lockfileUpdatedAt={scan?.lockfileUpdatedAt ?? null}
        lastScanAt={scan?.scannedAt ?? null}
      />

      <DepsSummaryCards
        isLoading={isLoading}
        summary={scan
          ? {
            riskScore: scan.riskScore,
            outdatedCount: scan.outdatedCount,
            majorCount: scan.majorCount,
            minorCount: scan.minorCount,
            patchCount: scan.patchCount,
            vulnCritical: scan.vulnCritical,
            vulnHigh: scan.vulnHigh,
            vulnModerate: scan.vulnModerate,
            vulnLow: scan.vulnLow,
            lockfileUpdatedAt: scan.lockfileUpdatedAt,
            scannedAt: scan.scannedAt,
          }
          : null}
      />

      <DepsPackageTable packages={scan?.packages ?? []} isLoading={isLoading} />
    </Box>
  )
}
