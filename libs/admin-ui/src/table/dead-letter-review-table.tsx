import { Card, Heading, Stack, Table, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'

export interface DeadLetterReviewColumn<T> {
  /** Заголовок колонки */
  header: string
  /** Рендер значения ячейки для строки */
  render: (row: T) => ReactNode
  /** Размер шрифта ячейки (по умолчанию 'sm') */
  fontSize?: 'xs' | 'sm' | 'md'
  /** Стиль шрифта ('mono' для сырого payload/кода) */
  fontFamily?: 'mono' | 'body'
  /** Не переносить содержимое ячейки */
  whiteSpace?: 'nowrap' | 'pre-wrap'
  /** Максимальная ширина ячейки (Chakra token, например '72') */
  maxW?: string
}

interface DeadLetterReviewTableProps<T> {
  /** Заголовок карточки */
  title: string
  /** Пояснение под заголовком — что за очередь и как её разбирать */
  description: string
  /** Строки очереди */
  rows: T[]
  /** Извлечение стабильного ключа строки */
  rowKey: (row: T) => string
  /** Определения колонок кроме последней («Решение») */
  columns: DeadLetterReviewColumn<T>[]
  /** Рендер последней колонки — форма принятия решения по строке */
  renderDecision: (row: T) => ReactNode
  /** Текст пустого состояния очереди */
  emptyLabel?: string
  /** Текст ошибки последнего действия, если было */
  error?: string | null
}

/**
 * Карточка «таблица ручной проверки dead-letter событий» — общий паттерн для очередей вебхуков,
 * не обработанных автоматически: банковская (М7B.4) и телефония/email/Telegram (М7B.4). Каждая
 * очередь задаёт свой набор колонок и свою форму решения (выбор статуса, Replay/Discard и т.п.)
 * через рендер-пропы — общий остаётся только каркас Card + Table + пустое состояние.
 *
 * @example
 * ```tsx
 * <DeadLetterReviewTable
 *   title="Заявки в банк — требуют проверки"
 *   description="Вебхук пришёл с несовместимым переходом статуса — выберите итоговый статус вручную."
 *   rows={rows}
 *   rowKey={(row) => row.inboxEventId}
 *   columns={[
 *     { header: 'Получено', render: (row) => new Date(row.receivedAt).toLocaleString('ru-RU') },
 *     { header: 'Причина отказа', render: (row) => ERROR_LABEL[row.lastErrorCode ?? ''] ?? row.lastErrorCode ?? '—' },
 *   ]}
 *   renderDecision={(row) => <MyDecisionForm row={row} />}
 * />
 * ```
 */
export function DeadLetterReviewTable<T>(
  { title, description, rows, rowKey, columns, renderDecision, emptyLabel = 'Очередь пуста', error }:
    DeadLetterReviewTableProps<T>,
) {
  return (
    <Card.Root shadow="sm">
      <Card.Header>
        <Heading size="sm">{title}</Heading>
        <Text fontSize="sm" color="fg.muted" mt={1}>{description}</Text>
      </Card.Header>
      <Card.Body>
        {rows.length === 0
          ? <Text fontSize="sm" color="fg.muted">{emptyLabel}</Text>
          : (
            <Stack gap={4}>
              {error && <Text fontSize="sm" color="fg.error">{error}</Text>}
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row>
                    {columns.map((column) => (
                      <Table.ColumnHeader key={column.header}>{column.header}</Table.ColumnHeader>
                    ))}
                    <Table.ColumnHeader>Решение</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {rows.map((row) => (
                    <Table.Row key={rowKey(row)}>
                      {columns.map((column) => (
                        <Table.Cell
                          key={column.header}
                          fontSize={column.fontSize ?? 'sm'}
                          fontFamily={column.fontFamily}
                          whiteSpace={column.whiteSpace}
                          maxW={column.maxW}
                        >
                          {column.render(row)}
                        </Table.Cell>
                      ))}
                      <Table.Cell>{renderDecision(row)}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Stack>
          )}
      </Card.Body>
    </Card.Root>
  )
}
