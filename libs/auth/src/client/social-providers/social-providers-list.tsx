'use client'

import { Badge, Card, Link, Table, Text } from '@chakra-ui/react'
import NextLink from 'next/link'
import type { ReactNode } from 'react'

import type { SocialProviderRow } from '../../types'

const DEFAULT_PROVIDER_LABELS: Record<string, string> = {
  google: 'Google',
  vk: 'VK',
  yandex: 'Yandex',
  telegram: 'Telegram',
}

const DEFAULT_DESCRIPTION =
  'Собственные OAuth-приложения (Tier 2) — вход своими ключами, без Ключницы letar.best. Client '
  + 'Secret хранится зашифрованным и никогда не показывается после сохранения.'

export interface SocialProvidersListProps {
  providers: SocialProviderRow[]
  /** Подписи провайдеров для отображения в таблице (по умолчанию — Google/VK/Yandex/Telegram) */
  providerLabels?: Record<string, string>
  /** Ссылка на страницу создания */
  newHref: string
  /** Строит ссылку на страницу редактирования по id провайдера */
  editHref: (id: string) => string
  /** Текст-подводка над таблицей (переопределяемо, напр. с упоминанием кастомных колбэков) */
  description?: ReactNode
  emptyMessage?: string
}

/**
 * Список Tier2 self-service OAuth-провайдеров — таблица с провайдером/Client ID/статусом/
 * ссылкой на редактирование. Заголовок страницы и кнопка «Добавить» остаются в приложении
 * (разный layout: `AdminPageLayout` у dsperevod, обычный `HStack` у остальных).
 *
 * @example
 * ```tsx
 * <SocialProvidersList
 *   providers={providers}
 *   providerLabels={{ google: 'Google', vk: 'VK' }}
 *   newHref="/admin/social-providers/new"
 *   editHref={(id) => `/admin/social-providers/${id}`}
 * />
 * ```
 */
export function SocialProvidersList({
  providers,
  providerLabels = DEFAULT_PROVIDER_LABELS,
  editHref,
  description = DEFAULT_DESCRIPTION,
  emptyMessage = 'Провайдеров нет — соц-вход недоступен либо использует env-переменные.',
}: SocialProvidersListProps) {
  return (
    <>
      <Text fontSize="sm" color="fg.muted" mb={4}>
        {description}
      </Text>

      <Card.Root shadow="sm">
        <Table.Root size="sm">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Провайдер</Table.ColumnHeader>
              <Table.ColumnHeader>Client ID</Table.ColumnHeader>
              <Table.ColumnHeader>Статус</Table.ColumnHeader>
              <Table.ColumnHeader />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {providers.map((p) => (
              <Table.Row key={p.id} _hover={{ bg: 'bg.subtle' }}>
                <Table.Cell>
                  <Text fontWeight="medium" fontSize="sm">
                    {providerLabels[p.providerId] ?? p.providerId}
                  </Text>
                </Table.Cell>
                <Table.Cell fontSize="sm" fontFamily="mono">
                  {p.clientId}
                </Table.Cell>
                <Table.Cell>
                  <Badge colorPalette={p.enabled ? 'green' : 'gray'} variant="subtle" size="sm">
                    {p.enabled ? 'Включён' : 'Выключен'}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Link asChild fontSize="sm" color="brand.500">
                    <NextLink href={editHref(p.id)}>Редактировать</NextLink>
                  </Link>
                </Table.Cell>
              </Table.Row>
            ))}
            {providers.length === 0 && (
              <Table.Row>
                <Table.Cell colSpan={4}>
                  <Text fontSize="sm" color="fg.muted" py={2}>
                    {emptyMessage}
                  </Text>
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table.Root>
      </Card.Root>

      <Text fontSize="xs" color="fg.muted" mt={4}>
        Изменения применяются при следующем перезапуске приложения (провайдеры читаются один раз при старте процесса, не
        «на лету»).
      </Text>
    </>
  )
}
