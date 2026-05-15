'use client'

import { Badge, Box, Card, Stack, Text } from '@chakra-ui/react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface RequestHistoryEntry {
  id: string
  requestText: string
  version: number
  changedBy?: string | null
  changeReason?: string | null
  isApproved: boolean
  approvedAt?: Date | null
  createdAt: Date
}

interface RequestHistoryProps {
  history: RequestHistoryEntry[]
  currentUserId?: string
}

/**
 * Компонент для отображения истории изменений основного запроса клиента.
 * Показывает все версии запроса с временными метками и причинами изменений.
 */
export function RequestHistory({ history, currentUserId: _currentUserId }: RequestHistoryProps) {
  if (history.length === 0) {
    return (
      <Box p={4} bg="gray.subtle" borderRadius="md">
        <Text color="gray.fg" fontSize="sm">
          История запросов пока пуста
        </Text>
      </Box>
    )
  }

  // Сортируем от новых к старым
  const sortedHistory = [...history].sort((a, b) => b.version - a.version)

  return (
    <Stack gap={3}>
      {sortedHistory.map((entry, index) => {
        const isLatest = index === 0
        const isChanged = entry.changedBy !== null

        return (
          <Card.Root key={entry.id} borderWidth="1px" borderColor={isLatest ? 'fg.solid' : 'border'}>
            <Card.Body>
              {/* Заголовок версии */}
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box display="flex" gap={2} alignItems="center">
                  <Text fontWeight="semibold" fontSize="sm">
                    Версия {entry.version}
                  </Text>
                  {isLatest && (
                    <Badge colorPalette="fg" size="sm">
                      Текущая
                    </Badge>
                  )}
                  {entry.isApproved && (
                    <Badge colorPalette="green" size="sm">
                      Утверждена
                    </Badge>
                  )}
                </Box>
                <Text fontSize="xs" color="gray.fg">
                  {format(new Date(entry.createdAt), 'd MMMM yyyy, HH:mm', { locale: ru })}
                </Text>
              </Box>

              {/* Текст запроса */}
              <Box
                p={3}
                bg="bg.subtle"
                borderRadius="md"
                borderLeftWidth="3px"
                borderLeftColor={isLatest ? 'fg.solid' : 'border'}
                mb={2}
              >
                <Text fontSize="sm" whiteSpace="pre-wrap">
                  {entry.requestText}
                </Text>
              </Box>

              {/* Метаинформация */}
              {(isChanged || entry.changeReason) && (
                <Box fontSize="xs" color="gray.fg">
                  {entry.changeReason && (
                    <Text>
                      <Text as="span" fontWeight="medium">
                        Причина изменения:
                      </Text>{' '}
                      {entry.changeReason}
                    </Text>
                  )}
                  {entry.approvedAt && (
                    <Text>
                      <Text as="span" fontWeight="medium">
                        Утверждено:
                      </Text>{' '}
                      {format(new Date(entry.approvedAt), 'd MMMM yyyy, HH:mm', { locale: ru })}
                    </Text>
                  )}
                </Box>
              )}
            </Card.Body>
          </Card.Root>
        )
      })}
    </Stack>
  )
}
