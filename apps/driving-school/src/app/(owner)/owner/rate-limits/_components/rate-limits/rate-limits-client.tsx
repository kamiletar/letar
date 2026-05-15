'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Card, HStack, Spinner, Stack, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'

import { BlacklistSection } from './blacklist-section'
import { CustomLimitForm } from './custom-limit-form'
import { CustomLimitsTable } from './custom-limits-table'
import { InfoCard } from './info-card'
import { StatsGrid } from './stats-grid'
import type { RateLimitsClientProps, RateLimitSettings, RateLimitStats } from './types'
import { WhitelistSection } from './whitelist-section'

/**
 * Клиентский компонент управления Rate Limiting.
 */
export function RateLimitsClient({ organizations }: RateLimitsClientProps) {
  const [stats, setStats] = useState<RateLimitStats | null>(null)
  const [settings, setSettings] = useState<RateLimitSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Формы
  const [selectedOrganization, setSelectedOrganization] = useState('')
  const [customLimit, setCustomLimit] = useState('')

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/owner/rate-limits')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const performAction = async (action: string, organizationId: string, limit?: number) => {
    setActionLoading(`${action}-${organizationId}`)
    try {
      const response = await fetch('/api/owner/rate-limits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, organizationId, limit }),
      })
      const data = await response.json()

      if (response.ok) {
        toaster.success({ title: 'Успешно', description: data.message })
        await fetchData()
      } else {
        toaster.error({ title: 'Ошибка', description: data.error })
      }
    } catch {
      toaster.error({ title: 'Ошибка', description: 'Не удалось выполнить действие' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleSetLimit = async () => {
    if (!selectedOrganization || !customLimit) {
      toaster.error({ title: 'Ошибка', description: 'Выберите организацию и укажите лимит' })
      return
    }
    await performAction('setLimit', selectedOrganization, parseInt(customLimit, 10))
    setSelectedOrganization('')
    setCustomLimit('')
  }

  const getOrganizationName = (organizationId: string): string => {
    const org = organizations.find((o) => o.id === organizationId)
    return org?.name || organizationId.slice(0, 8) + '...'
  }

  if (loading) {
    return (
      <Card.Root>
        <Card.Body>
          <HStack justify="center" py={8}>
            <Spinner />
            <Text>Загрузка...</Text>
          </HStack>
        </Card.Body>
      </Card.Root>
    )
  }

  return (
    <Stack gap={6}>
      <StatsGrid stats={stats} />

      <CustomLimitForm
        organizations={organizations}
        selectedOrganization={selectedOrganization}
        customLimit={customLimit}
        onOrganizationChange={setSelectedOrganization}
        onLimitChange={setCustomLimit}
        onSubmit={handleSetLimit}
        loading={actionLoading === 'setLimit-'}
      />

      {settings && (
        <CustomLimitsTable
          settings={settings}
          getOrganizationName={getOrganizationName}
          onRemoveLimit={(organizationId) => performAction('removeLimit', organizationId)}
          onResetCounters={(organizationId) => performAction('resetCounters', organizationId)}
          actionLoading={actionLoading}
        />
      )}

      <WhitelistSection
        settings={settings}
        organizations={organizations}
        selectedOrganization={selectedOrganization}
        onOrganizationChange={setSelectedOrganization}
        getOrganizationName={getOrganizationName}
        onRemove={(organizationId) => performAction('removeFromWhitelist', organizationId)}
        onAdd={() => {
          if (selectedOrganization) {
            performAction('addToWhitelist', selectedOrganization)
            setSelectedOrganization('')
          }
        }}
        actionLoading={actionLoading}
      />

      <BlacklistSection
        settings={settings}
        organizations={organizations}
        selectedOrganization={selectedOrganization}
        onOrganizationChange={setSelectedOrganization}
        getOrganizationName={getOrganizationName}
        onRemove={(organizationId) => performAction('removeFromBlacklist', organizationId)}
        onAdd={() => {
          if (selectedOrganization) {
            performAction('addToBlacklist', selectedOrganization)
            setSelectedOrganization('')
          }
        }}
        actionLoading={actionLoading}
      />

      <InfoCard stats={stats} />
    </Stack>
  )
}
