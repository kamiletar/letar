'use client'

import { Card, Heading, Table, Text } from '@chakra-ui/react'
import type { DomainPageViews } from './api'

interface PageViewsCardProps {
  data: DomainPageViews[] | undefined
}

/**
 * Грубый счётчик посещений (hits/day/domain) без ПДн — дополнение к Umami там, где cookie-consent
 * gate не пропускает часть трафика (см. PLAN.md). Считает КАЖДЫЙ запрос к странице, включая ботов
 * и повторные заходы — это не уникальные пользователи/сессии.
 */
export function PageViewsCard({ data }: PageViewsCardProps) {
  if (!data || data.length === 0) {
    return null
  }

  return (
    <Card.Root mb="6">
      <Card.Body px="4" py="3">
        <Heading size="sm" mb="1">
          Просмотры страниц (грубый счётчик)
        </Heading>
        <Text fontSize="xs" color="fg.muted" mb="3">
          Каждый HTTP-запрос по домену, включая ботов и повторные заходы — без IP/UA/cookie, не уникальные посетители.
          Дополняет Umami там, где cookie-consent ещё не дан.
        </Text>
        <Table.Root size="sm">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Домен</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="end">Сегодня</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="end">7 дней</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {data.map((row) => (
              <Table.Row key={row.domain}>
                <Table.Cell fontSize="sm">{row.domain}</Table.Cell>
                <Table.Cell textAlign="end" fontSize="sm">
                  {row.today.toLocaleString('ru-RU')}
                </Table.Cell>
                <Table.Cell textAlign="end" fontSize="sm" fontWeight="medium">
                  {row.last7Days.toLocaleString('ru-RU')}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Card.Body>
    </Card.Root>
  )
}
