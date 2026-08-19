import { Badge, Box, Card, Heading, Stack, Table, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'

export interface AssessmentHistoryRow {
  /** Идентификатор записи истории (снапшот неизменяем) */
  id: string
  /** Дата создания записи (ISO-строка) */
  createdAt: string
  /** Машинный статус результата — ключ для `statusPalette` */
  status: string
  /** Человекочитаемая подпись статуса для бейджа */
  statusLabel: string
  /** Значение прикладной колонки (дом, программа и т.п.) */
  extraColumnValue: string
  /** Причины результата, если есть */
  reasons: string[]
}

interface AssessmentHistoryTableProps {
  /** Заголовок карточки */
  title: string
  /** Подпись колонки после «Результат» (например «Дом», «Программа») */
  extraColumnLabel: string
  /** Словарь статус → colorPalette бейджа */
  statusPalette: Record<string, string>
  /** Строки истории проверок */
  rows: AssessmentHistoryRow[]
  /** Текст пустого состояния истории */
  emptyHistoryLabel?: string
  /** Предупреждения над таблицей (например «сначала заполните карточку участка») */
  warnings?: ReactNode
  /** Форма/кнопка запуска новой проверки под таблицей */
  actions?: ReactNode
}

/**
 * Карточка «бейдж-статус + таблица истории неизменяемых снапшотов» — общий паттерн для
 * скрининг-проверок сделки (участок/дом, финансирование и т.п.), каждый прогон копится в
 * истории, не перезаписывает предыдущий результат.
 *
 * @example
 * ```tsx
 * <AssessmentHistoryTable
 *   title="Проверка «влезет ли дом на участок»"
 *   extraColumnLabel="Дом"
 *   statusPalette={RESULT_PALETTE}
 *   rows={assessments.map((a) => ({
 *     id: a.id,
 *     createdAt: a.createdAt,
 *     status: a.result,
 *     statusLabel: RESULT_LABEL[a.result] ?? a.result,
 *     extraColumnValue: a.houseVersionLabel,
 *     reasons: a.reasons,
 *   }))}
 *   warnings={!hasPlot && <Text fontSize="sm" color="fg.muted">Сначала заполните карточку участка выше</Text>}
 *   actions={canAssess && <Button onClick={handleAssess}>Проверить участок</Button>}
 * />
 * ```
 */
export function AssessmentHistoryTable(
  { title, extraColumnLabel, statusPalette, rows, emptyHistoryLabel = 'Проверок ещё не было', warnings, actions }:
    AssessmentHistoryTableProps,
) {
  return (
    <Card.Root shadow="sm">
      <Card.Header>
        <Heading size="sm">{title}</Heading>
      </Card.Header>
      <Card.Body>
        <Stack gap={4}>
          {warnings}

          {rows.length === 0
            ? <Text fontSize="sm" color="fg.muted">{emptyHistoryLabel}</Text>
            : (
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Дата</Table.ColumnHeader>
                    <Table.ColumnHeader>Результат</Table.ColumnHeader>
                    <Table.ColumnHeader>{extraColumnLabel}</Table.ColumnHeader>
                    <Table.ColumnHeader>Причины</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {rows.map((row) => (
                    <Table.Row key={row.id}>
                      <Table.Cell fontSize="sm">{new Date(row.createdAt).toLocaleString('ru-RU')}</Table.Cell>
                      <Table.Cell>
                        <Badge colorPalette={statusPalette[row.status] ?? 'gray'}>{row.statusLabel}</Badge>
                      </Table.Cell>
                      <Table.Cell fontSize="sm">{row.extraColumnValue}</Table.Cell>
                      <Table.Cell fontSize="sm">{row.reasons.length === 0 ? '—' : row.reasons.join('; ')}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            )}

          {actions && (
            <Box borderTopWidth="1px" borderColor="border.control" pt={4}>
              {actions}
            </Box>
          )}
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}
