'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Avatar, Box, Button, HStack, NativeSelect, Stack, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { LuCheck, LuUser, LuX } from 'react-icons/lu'

import type { ExamRegistrationWithUser } from '../../../_actions/exam.action'
import { useBulkExamResults } from '../../../_hooks/use-bulk-exam-results'

interface ExamResultsFormProps {
  sessionId: string
  registrations: ExamRegistrationWithUser[]
}

type ExamResultType = 'PASSED' | 'FAILED' | 'NO_SHOW' | ''

export function ExamResultsForm({ sessionId: _sessionId, registrations }: ExamResultsFormProps) {
  const mutation = useBulkExamResults()
  const [results, setResults] = useState<Record<string, ExamResultType>>(
    Object.fromEntries(registrations.map((r) => [r.id, (r.attempt?.result as ExamResultType) || '']))
  )

  const handleResultChange = (registrationId: string, result: ExamResultType) => {
    setResults((prev) => ({
      ...prev,
      [registrationId]: result,
    }))
  }

  const handleSave = () => {
    const resultsList = Object.entries(results)
      .filter(([_, result]) => result !== '')
      .map(([registrationId, result]) => ({
        registrationId,
        result: result as 'PASSED' | 'FAILED' | 'NO_SHOW',
      }))

    if (resultsList.length === 0) {
      toaster.error({ title: 'Выберите результаты для сохранения' })
      return
    }

    mutation.mutate(
      { results: resultsList },
      {
        onSuccess: (result) => {
          if (result.success) {
            toaster.success({ title: 'Результаты сохранены' })
          } else {
            toaster.error({ title: 'Ошибка', description: result.error })
          }
        },
        onError: () => {
          toaster.error({ title: 'Ошибка', description: 'Не удалось сохранить' })
        },
      }
    )
  }

  const handleSetAll = (result: ExamResultType) => {
    setResults(Object.fromEntries(registrations.map((r) => [r.id, result])))
  }

  const passedCount = Object.values(results).filter((r) => r === 'PASSED').length
  const failedCount = Object.values(results).filter((r) => r === 'FAILED').length
  const noShowCount = Object.values(results).filter((r) => r === 'NO_SHOW').length
  const pendingCount = Object.values(results).filter((r) => r === '').length

  return (
    <VStack align="stretch" gap={4}>
      {/* Статистика и быстрые действия */}
      <HStack justify="space-between" wrap="wrap" gap={2}>
        <HStack gap={2} fontSize="sm">
          <Text color="success.fg">Сдали: {passedCount}</Text>
          <Text color="error.fg">Не сдали: {failedCount}</Text>
          <Text color="warning.fg">Неявка: {noShowCount}</Text>
          <Text color="fg.muted">Не отмечено: {pendingCount}</Text>
        </HStack>
        <HStack gap={2}>
          <Button variant="outline" size="sm" colorPalette="green" onClick={() => handleSetAll('PASSED')}>
            Все сдали
          </Button>
          <Button variant="outline" size="sm" colorPalette="red" onClick={() => handleSetAll('FAILED')}>
            Все не сдали
          </Button>
        </HStack>
      </HStack>

      {/* Список участников */}
      <Stack gap={2}>
        {registrations.map((registration) => {
          const currentResult = results[registration.id]
          let bgColor = 'bg.panel'
          if (currentResult === 'PASSED') {
            bgColor = 'success.subtle'
          } else if (currentResult === 'FAILED') {
            bgColor = 'error.subtle'
          } else if (currentResult === 'NO_SHOW') {
            bgColor = 'warning.subtle'
          }

          return (
            <Box key={registration.id} p={4} borderRadius="md" borderWidth="1px" bg={bgColor}>
              <HStack justify="space-between" wrap="wrap" gap={4}>
                <HStack gap={3}>
                  <Avatar.Root size="sm">
                    <Avatar.Fallback>
                      <LuUser />
                    </Avatar.Fallback>
                    {registration.user.image && <Avatar.Image src={registration.user.image} />}
                  </Avatar.Root>
                  <VStack align="start" gap={0}>
                    <Text fontWeight="medium">{registration.user.name}</Text>
                    {registration.user.email && (
                      <Text fontSize="sm" color="fg.muted">
                        {registration.user.email}
                      </Text>
                    )}
                  </VStack>
                </HStack>

                <HStack gap={2}>
                  {/* Иконки быстрого выбора */}
                  <Button
                    variant={currentResult === 'PASSED' ? 'solid' : 'outline'}
                    colorPalette="green"
                    size="sm"
                    onClick={() => handleResultChange(registration.id, 'PASSED')}
                  >
                    <LuCheck />
                  </Button>
                  <Button
                    variant={currentResult === 'FAILED' ? 'solid' : 'outline'}
                    colorPalette="red"
                    size="sm"
                    onClick={() => handleResultChange(registration.id, 'FAILED')}
                  >
                    <LuX />
                  </Button>

                  {/* Выпадающий список */}
                  <NativeSelect.Root size="sm" width="150px">
                    <NativeSelect.Field
                      value={currentResult}
                      onChange={(e) => handleResultChange(registration.id, e.target.value as ExamResultType)}
                    >
                      <option value="">Не выбрано</option>
                      <option value="PASSED">Сдал</option>
                      <option value="FAILED">Не сдал</option>
                      <option value="NO_SHOW">Неявка</option>
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </HStack>
              </HStack>
            </Box>
          )
        })}
      </Stack>

      {/* Кнопка сохранения */}
      <Button colorPalette="brand" size="lg" onClick={handleSave} loading={mutation.isPending}>
        Сохранить результаты
      </Button>
    </VStack>
  )
}
