'use client'

import { TableRowSkeleton } from '@/app/_components/ui/skeletons'
import { Badge, Box, Card, HStack, Input, Table, Tabs, Text } from '@chakra-ui/react'
import { Fragment, useMemo, useState } from 'react'

export interface DepPackageRow {
  id: string
  name: string
  currentVersion: string | null
  wantedVersion: string | null
  latestVersion: string | null
  updateKind: 'MAJOR' | 'MINOR' | 'PATCH' | 'NONE'
  depType: string
  isPinned: boolean
  vulnerable: boolean
  maxSeverity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | null
  advisoryCount: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- сырой JSON из bun audit
  advisories: any
  riskLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

type Filter = 'all' | 'vulnerable' | 'major' | 'minor' | 'patch' | 'pinned'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'vulnerable', label: 'Уязвимые' },
  { key: 'major', label: 'Major' },
  { key: 'minor', label: 'Minor' },
  { key: 'patch', label: 'Patch' },
  { key: 'pinned', label: '📌 Закреплённые' },
]

const RISK_RANK: Record<DepPackageRow['riskLevel'], number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  NONE: 0,
}

function severityColor(sev: DepPackageRow['maxSeverity']): string {
  switch (sev) {
    case 'CRITICAL':
      return 'red'
    case 'HIGH':
      return 'orange'
    case 'MODERATE':
      return 'yellow'
    case 'LOW':
      return 'blue'
    default:
      return 'gray'
  }
}

function riskColor(risk: DepPackageRow['riskLevel']): string {
  switch (risk) {
    case 'CRITICAL':
      return 'red'
    case 'HIGH':
      return 'orange'
    case 'MEDIUM':
      return 'yellow'
    case 'LOW':
      return 'blue'
    default:
      return 'gray'
  }
}

function matchesFilter(pkg: DepPackageRow, filter: Filter): boolean {
  switch (filter) {
    case 'vulnerable':
      return pkg.vulnerable
    case 'major':
      return pkg.updateKind === 'MAJOR'
    case 'minor':
      return pkg.updateKind === 'MINOR'
    case 'patch':
      return pkg.updateKind === 'PATCH'
    case 'pinned':
      return pkg.isPinned
    default:
      return true
  }
}

export function DepsPackageTable({ packages, isLoading }: { packages: DepPackageRow[]; isLoading: boolean }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const rows = useMemo(() => {
    return packages
      .filter((p) => matchesFilter(p, filter))
      .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel] || a.name.localeCompare(b.name))
  }, [packages, filter, search])

  return (
    <Card.Root>
      <Card.Body p="0">
        <Box p="4" borderBottomWidth="1px">
          <HStack justify="space-between" flexWrap="wrap" gap="3">
            <Tabs.Root value={filter} onValueChange={(d) => setFilter(d.value as Filter)}>
              <Tabs.List>
                {FILTERS.map((f) => (
                  <Tabs.Trigger key={f.key} value={f.key}>
                    {f.label}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>
            </Tabs.Root>
            <Input
              placeholder="Поиск по имени пакета..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              maxW="240px"
              size="sm"
            />
          </HStack>
        </Box>

        <Table.Root size="sm">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Пакет</Table.ColumnHeader>
              <Table.ColumnHeader>Текущая</Table.ColumnHeader>
              <Table.ColumnHeader>Целевая</Table.ColumnHeader>
              <Table.ColumnHeader>Последняя</Table.ColumnHeader>
              <Table.ColumnHeader>Обновление</Table.ColumnHeader>
              <Table.ColumnHeader>Уязвимость</Table.ColumnHeader>
              <Table.ColumnHeader>Тип</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {isLoading && Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} columns={7} />)}

            {!isLoading && rows.map((pkg) => (
              <Fragment key={pkg.id}>
                <Table.Row
                  cursor={pkg.advisoryCount > 0 ? 'pointer' : undefined}
                  onClick={() => pkg.advisoryCount > 0 && setExpanded(expanded === pkg.id ? null : pkg.id)}
                >
                  <Table.Cell>
                    <HStack gap="2">
                      {pkg.isPinned && <Text title="Закреплён в resolutions/overrides">📌</Text>}
                      <Text fontWeight="medium">{pkg.name}</Text>
                      {pkg.riskLevel !== 'NONE' && (
                        <Badge colorPalette={riskColor(pkg.riskLevel)} size="xs">
                          {pkg.riskLevel}
                        </Badge>
                      )}
                    </HStack>
                  </Table.Cell>
                  <Table.Cell>{pkg.currentVersion ?? '—'}</Table.Cell>
                  <Table.Cell>{pkg.wantedVersion ?? '—'}</Table.Cell>
                  <Table.Cell>{pkg.latestVersion ?? '—'}</Table.Cell>
                  <Table.Cell>
                    {pkg.updateKind !== 'NONE' && <Badge size="sm">{pkg.updateKind}</Badge>}
                  </Table.Cell>
                  <Table.Cell>
                    {pkg.vulnerable && (
                      <Badge colorPalette={severityColor(pkg.maxSeverity)} size="sm">
                        {pkg.maxSeverity} × {pkg.advisoryCount}
                      </Badge>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="xs" color="fg.muted">
                      {pkg.depType}
                    </Text>
                  </Table.Cell>
                </Table.Row>
                {expanded === pkg.id && Array.isArray(pkg.advisories) && (
                  <Table.Row key={`${pkg.id}-advisories`}>
                    <Table.Cell colSpan={7} bg="bg.muted">
                      <Box py="2" px="2">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {pkg.advisories.map((a: any) => (
                          <HStack key={a.id} gap="2" mb="1" fontSize="sm">
                            <Badge colorPalette={severityColor(a.severity?.toUpperCase())} size="xs">
                              {a.severity}
                            </Badge>
                            <Text
                              asChild
                              color="blue.500"
                            >
                              <a href={a.url} target="_blank" rel="noreferrer">
                                {a.title}
                              </a>
                            </Text>
                          </HStack>
                        ))}
                      </Box>
                    </Table.Cell>
                  </Table.Row>
                )}
              </Fragment>
            ))}
          </Table.Body>
        </Table.Root>

        {!isLoading && rows.length === 0 && (
          <Box textAlign="center" py="12">
            <Text color="fg.muted">Нет пакетов по выбранному фильтру</Text>
          </Box>
        )}
      </Card.Body>
    </Card.Root>
  )
}
