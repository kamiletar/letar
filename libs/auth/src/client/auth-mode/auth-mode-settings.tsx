'use client'

import { Badge, Box, Card, Heading, List, Table, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'

import { AuthModeRequestForm, type AuthModeRequestFormProps } from './auth-mode-request-form'

export interface AuthModeRequestRow {
  id: string
  name: string | null
  email: string
  createdAt: Date
}

export interface AuthModeTierPoint {
  text: string
  /** Выделить пункт как критичный (жирный, оранжевый) — например необратимость миграции identity */
  emphasized?: boolean
}

export interface AuthModeSettingsProps {
  /** Ярлык текущего режима, например "Tier 2 — Standalone (свои ключи)" */
  currentModeLabel: string
  /** Пункты карточки Tier 2 (текущий выбор) */
  tier2Points: string[]
  /** Пункты карточки Tier 1 (альтернатива) */
  tier1Points: AuthModeTierPoint[]
  /** История запросов, уже отсортированная по убыванию даты */
  requests: AuthModeRequestRow[]
  /** Server action — фиксирует informed-consent запрос перехода на Tier 1 */
  onRequest: AuthModeRequestFormProps['onRequest']
  /** Текст в алерте после успешной фиксации запроса (переопределить для доп. рисков — VK/Yandex и т.д.) */
  successMessage?: string
  /** Доп. контент под таблицей истории — например ссылка на общий журнал аудита приложения */
  footer?: ReactNode
}

/**
 * Tier 1 (hub-client) / Tier 2 (standalone) informed-consent страница (§2.3 корневого PLAN.md,
 * Этап 8) — сравнение режимов + запрос перехода, пишется во внутренний аудит приложения.
 * Сам переход НЕ автоматизирован (смена режима = миграция identity, не рантайм-флаг) — форма
 * только фиксирует решение владельца, дальнейшая миграция делается разработчиком отдельно.
 *
 * @example
 * ```tsx
 * // app/admin/settings/auth-mode/page.tsx
 * export default async function AuthModeSettingsPage() {
 *   const user = await requireAdmin()
 *   const requests = await db.someAuditModel.findMany({ ... })
 *   return (
 *     <AuthModeSettings
 *       currentModeLabel="Tier 2 — Standalone (свои ключи)"
 *       tier2Points={['Свой домен и бренд входа', 'Соц-вход через собственные OAuth-приложения']}
 *       tier1Points={[
 *         { text: 'Вход делегируется Ключнице (auth.letar.best)' },
 *         { text: 'user.id меняется на идентификатор Ключницы — требуется миграция данных', emphasized: true },
 *       ]}
 *       requests={requests.map((r) => ({ id: r.id, name: r.user.name, email: r.user.email, createdAt: r.createdAt }))}
 *       onRequest={requestAuthModeMigration}
 *     />
 *   )
 * }
 * ```
 */
export function AuthModeSettings({
  currentModeLabel,
  tier2Points,
  tier1Points,
  requests,
  onRequest,
  successMessage,
  footer,
}: AuthModeSettingsProps) {
  return (
    <Box>
      <Heading size="xl" mb={2}>
        Режим авторизации
      </Heading>
      <Text fontSize="sm" color="fg.muted" mb={6}>
        Текущий режим и выбор источника соц-секретов (§2.3 корневого PLAN.md летар). Смена режима — необратимая миграция
        identity пользователей, не рантайм-переключатель.
      </Text>

      <Card.Root shadow="sm" p={5} mb={6}>
        <Text fontSize="sm" color="fg.muted" mb={1}>
          Текущий режим
        </Text>
        <Badge colorPalette="brand" size="lg">
          {currentModeLabel}
        </Badge>
      </Card.Root>

      <Box display="grid" gridTemplateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4} mb={6}>
        <Card.Root shadow="sm" p={5} borderWidth="2px" borderColor="brand.400">
          <Badge colorPalette="brand" size="sm" mb={2} w="fit-content">
            Текущий выбор
          </Badge>
          <Heading size="sm" mb={3}>
            Tier 2 — свои ключи (standalone)
          </Heading>
          <List.Root fontSize="sm" color="fg.muted" gap={1} ps={4}>
            {tier2Points.map((point) => <List.Item key={point}>{point}</List.Item>)}
          </List.Root>
        </Card.Root>

        <Card.Root shadow="sm" p={5}>
          <Badge colorPalette="orange" size="sm" mb={2} w="fit-content">
            Альтернатива
          </Badge>
          <Heading size="sm" mb={3}>
            Tier 1 — авторизация через letar.best (hub-client)
          </Heading>
          <List.Root fontSize="sm" color="fg.muted" gap={1} ps={4}>
            {tier1Points.map((point) => (
              <List.Item
                key={point.text}
                fontWeight={point.emphasized ? 'medium' : undefined}
                color={point.emphasized ? 'orange.600' : undefined}
              >
                {point.text}
              </List.Item>
            ))}
          </List.Root>

          <Box mt={4} pt={4} borderTopWidth="1px">
            <AuthModeRequestForm onRequest={onRequest} successMessage={successMessage} />
          </Box>
        </Card.Root>
      </Box>

      <Heading size="sm" mb={3}>
        История запросов
      </Heading>
      <Card.Root shadow="sm">
        <Table.Root size="sm">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Кто</Table.ColumnHeader>
              <Table.ColumnHeader>Дата</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {requests.length === 0 && (
              <Table.Row>
                <Table.Cell colSpan={2} textAlign="center" py={6} color="fg.muted" fontSize="sm">
                  Запросов ещё не было
                </Table.Cell>
              </Table.Row>
            )}
            {requests.map((r) => (
              <Table.Row key={r.id}>
                <Table.Cell fontSize="sm">
                  {r.name} ({r.email})
                </Table.Cell>
                <Table.Cell fontSize="xs" color="fg.muted" whiteSpace="nowrap">
                  {r.createdAt.toLocaleString('ru-RU')}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Card.Root>

      {footer && (
        <Text fontSize="xs" color="fg.muted" mt={3}>
          {footer}
        </Text>
      )}
    </Box>
  )
}
