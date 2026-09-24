'use client'

import { ArchetestForm } from '@/archetest-form'
import { Link } from '@/i18n/navigation'
import { Badge, Box, SimpleGrid, Table, Text, VStack } from '@chakra-ui/react'
import { useFormUrlSync } from '@letar/forms'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo } from 'react'
import { z } from 'zod/v4'
import { RANKS } from '../../_data/ranks'
import {
  CLIENT_FILTER_DEFAULTS,
  type ClientFilters,
  type FilterableClient,
  filterClients,
} from '../../_lib/client-filter'

const FILTER_FIELDS = ['search', 'status', 'since', 'rankTier'] as const satisfies readonly (keyof ClientFilters)[]

/**
 * Только строки: Form.Field.Date без z.date() коммитит YYYY-MM-DD, Form.UrlSync пишет как есть.
 * `.optional()` — фильтры не обязательны: иначе у каждого поля звёздочка «обязательно»
 */
const FilterSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['all', 'ACTIVE', 'REVOKED']).optional(),
  since: z.string().optional(),
  rankTier: z.string().optional(),
})

export interface CabinetClientRow extends FilterableClient {
  id: string
  clientId: string
}

/**
 * Таблица клиентов психолога с фильтрами (Фаза 3, волна 7.3): поиск по имени/email, статус
 * связи, дата привязки «с», уровень ранга. Состояние — в URL (`Form.UrlSync`): ссылку на
 * отфильтрованный список можно сохранить. Данные уже на клиенте, поэтому `router` для RSC-рефетча
 * не нужен (`letar-forms-urlsync-missing-router-no-rsc-refetch`).
 */
export function FilteredClientsTable({ clients }: { clients: readonly CabinetClientRow[] }) {
  const t = useTranslations('cabinet')
  const tf = useTranslations('cabinet.filter')
  const locale = useLocale()
  const isRu = locale === 'ru'
  // URL применяется после маунта: первый рендер (SSR/гидратация) — всегда дефолты
  const { initialValue } = useFormUrlSync({ fields: [...FILTER_FIELDS], defaults: CLIENT_FILTER_DEFAULTS })

  const tierOptions = useMemo(() => {
    const tiers = [
      ...new Map(RANKS.map((r) => [r.tier, (isRu ? r.label : r.labelEn).replace(/\s+[IVX]+$/, '')])).entries(),
    ]
    return [{ label: tf('anyRank'), value: 'all' }, ...tiers.map(([value, label]) => ({ label, value }))]
  }, [isRu, tf])

  // Box w="100%": <form> внутри VStack align="start" сжимается по ширине содержимого — широкой
  // таблицы — и выталкивает страницу за край экрана на телефоне
  return (
    <Box w="100%">
      <ArchetestForm initialValue={initialValue} schema={FilterSchema}>
        <ArchetestForm.UrlSync fields={[...FILTER_FIELDS]} defaults={CLIENT_FILTER_DEFAULTS} />
        <VStack align="stretch" gap={4} w="100%">
          <SimpleGrid columns={{ base: 1, md: 4 }} gap={3}>
            <ArchetestForm.Field.String name="search" label={tf('search')} placeholder={tf('searchPlaceholder')} />
            <ArchetestForm.Field.Select
              name="status"
              label={tf('status')}
              options={[
                { label: tf('anyStatus'), value: 'all' },
                { label: t('active'), value: 'ACTIVE' },
                { label: t('revoked'), value: 'REVOKED' },
              ]}
            />
            <ArchetestForm.Field.Date name="since" label={tf('since')} />
            <ArchetestForm.Field.Select name="rankTier" label={tf('rank')} options={tierOptions} />
          </SimpleGrid>

          <ArchetestForm.Subscribe>
            {(values) => {
              // Subscribe отдаёт значения нетипизированными и с optional-полями — добиваем дефолтами
              const shown = filterClients(clients, { ...CLIENT_FILTER_DEFAULTS, ...(values as Partial<ClientFilters>) })
              if (shown.length === 0) {
                return (
                  <Text color="fg.muted" fontSize="sm">
                    {tf('empty')}
                  </Text>
                )
              }
              return (
                <Box w="100%">
                  <Text fontSize="xs" color="fg.muted" mb={2}>
                    {tf('shown', { shown: shown.length, total: clients.length })}
                  </Text>
                  {/* Скролл внутри таблицы: на телефоне она шире экрана */}
                  <Table.ScrollArea w="100%" borderWidth="1px" borderColor="border" borderRadius="md">
                    <Table.Root size="sm" w="100%">
                      <Table.Header>
                        <Table.Row>
                          <Table.ColumnHeader>{t('clientName')}</Table.ColumnHeader>
                          <Table.ColumnHeader>{t('clientEmail')}</Table.ColumnHeader>
                          <Table.ColumnHeader>{t('status')}</Table.ColumnHeader>
                          <Table.ColumnHeader>{t('linkedAt')}</Table.ColumnHeader>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {shown.map((client) => (
                          <Table.Row key={client.id}>
                            <Table.Cell>
                              {client.status === 'ACTIVE'
                                ? (
                                  <Box asChild fontWeight="bold" color="fg" _hover={{ textDecoration: 'underline' }}>
                                    <Link href={`/cabinet/${client.clientId}`}>{client.clientName}</Link>
                                  </Box>
                                )
                                : <Text color="fg.muted">{client.clientName}</Text>}
                            </Table.Cell>
                            <Table.Cell color="fg.muted">{client.clientEmail}</Table.Cell>
                            <Table.Cell>
                              <Badge colorPalette={client.status === 'ACTIVE' ? 'green' : 'gray'}>
                                {client.status === 'ACTIVE' ? t('active') : t('revoked')}
                              </Badge>
                            </Table.Cell>
                            <Table.Cell color="fg.muted">
                              {new Date(client.createdAt).toLocaleDateString(locale)}
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Root>
                  </Table.ScrollArea>
                </Box>
              )
            }}
          </ArchetestForm.Subscribe>
        </VStack>
      </ArchetestForm>
    </Box>
  )
}
