'use client'

/**
 * Шаг 2: Подключение жюри.
 *
 * Показывает QR-код для регистрации судей через телефон и 5 слотов.
 * Каждый слот имеет галочку «управляется вручную» — счётовод нажимает её если
 * судья не хочет (или не может) регистрироваться через телефон. Ручной слот
 * не имеет цвета и имени (цвет нужен только для светового индикатора телефона).
 *
 * Автосоздание inviteKey при монтировании если его ещё нет.
 */

import type { MatchSSEState } from '@/app/_hooks/use-match-sse'
import { JUDGE_COLORS, type JudgeColor } from '@/lib/judge-colors'
import { Badge, Box, Button, Checkbox, Flex, Heading, HStack, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { QRCodeSVG } from 'qrcode.react'
import { useCallback, useEffect, useState } from 'react'
import { assignManualJudgeAction, createJuryInviteAction, removeManualJudgeAction } from '../../_actions/scorer.action'
import type { MatchData } from '../scorer-client'

interface StepSelectJuryProps {
  match: MatchData
  matchState: MatchSSEState | null
}

const SLOT_NUMBERS = [1, 2, 3, 4, 5] as const
const EXPECTED_COLORS: JudgeColor[] = ['RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE']

export function StepSelectJury({ match, matchState }: StepSelectJuryProps) {
  const [pendingSlot, setPendingSlot] = useState<number | null>(null)
  const [pendingAll, setPendingAll] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // inviteKey хранится локально т.к. не передаётся через SSE (секрет)
  const [inviteKey, setInviteKey] = useState<string | null>(null)

  const currentHalf = matchState?.currentHalf ?? 1
  const judges = matchState?.judges ?? []

  // Автосоздание инвайта при монтировании (если его нет и слоты пустые)
  useEffect(() => {
    if (!inviteKey && judges.length === 0) {
      createJuryInviteAction(match.id, currentHalf)
        .then((res) => {
          if (res.success && res.inviteKey) {
            setInviteKey(res.inviteKey)
          }
        })
        .catch(console.error)
    }
  }, [match.id, currentHalf, inviteKey, judges.length])

  /** Назначить все незаполненные слоты вручную одной кнопкой */
  const handleAllManual = useCallback(async () => {
    setPendingAll(true)
    setError(null)
    for (const slotNum of SLOT_NUMBERS) {
      const alreadyFilled = judges.some((j) => j.judgeNumber === slotNum)
      if (!alreadyFilled) {
        await assignManualJudgeAction(match.id, slotNum)
      }
    }
    setPendingAll(false)
  }, [match.id, judges])

  const handleToggleManual = useCallback(
    async (slotNum: number, checked: boolean) => {
      setPendingSlot(slotNum)
      setError(null)
      const res = checked
        ? await assignManualJudgeAction(match.id, slotNum)
        : await removeManualJudgeAction(match.id, slotNum)
      setPendingSlot(null)
      if (!res.success) {
        setError(res.error ?? 'Не удалось изменить слот')
      }
    },
    [match.id]
  )

  const inviteUrl = inviteKey
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/match/${match.id}/judge?half=${currentHalf}&invite=${inviteKey}`
    : null

  const slotsFilled = judges.length
  const allFilled = slotsFilled >= 5

  return (
    <VStack gap={6} align="stretch" py={4}>
      <Box textAlign="center">
        <Heading size="xl" mb={1}>
          Тайм {currentHalf}: подключение жюри
        </Heading>
        <Text color="fg.muted">Судьи сканируют QR-код или вы отмечаете слот вручную. Нужно 5 судей.</Text>
      </Box>

      {error && (
        <Text color="red.fg" fontSize="sm" textAlign="center">
          {error}
        </Text>
      )}

      {/* Быстрое заполнение всех слотов вручную */}
      {!allFilled && (
        <Button
          variant="outline"
          colorPalette="gray"
          size="sm"
          onClick={handleAllManual}
          loading={pendingAll}
          alignSelf="flex-start"
        >
          Все вручную
        </Button>
      )}

      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
        {/* QR-код — крупный */}
        <Box
          bg="white"
          p={{ base: 4, md: 6 }}
          borderRadius="xl"
          textAlign="center"
          borderWidth="1px"
          borderColor="border.muted"
        >
          {inviteUrl ? (
            <>
              <Box display="flex" justifyContent="center">
                <QRCodeSVG
                  value={inviteUrl}
                  size={480}
                  style={{ width: '100%', height: 'auto', maxWidth: '480px' }}
                  level="M"
                />
              </Box>
              <Text fontSize="xs" color="gray.600" mt={3} wordBreak="break-all">
                {inviteUrl}
              </Text>
            </>
          ) : (
            <Text color="gray.500">Генерация инвайта...</Text>
          )}
        </Box>

        {/* Слоты судей */}
        <VStack gap={3} align="stretch">
          <Text fontSize="sm" fontWeight="bold">
            Слоты судей ({slotsFilled}/5)
          </Text>
          {SLOT_NUMBERS.map((slotNum) => {
            const judge = judges.find((j) => j.judgeNumber === slotNum)
            const isManual = judge?.manual === true
            const expectedColor = EXPECTED_COLORS[slotNum - 1]
            const colorConfig = JUDGE_COLORS[expectedColor]
            const filledByQR = judge && !isManual

            // Если заполнен через QR — показываем цвет и имя
            // Если ручной — серый фон + галочка снята/поставлена
            // Если пуст — галочка для ручного режима

            return (
              <Box
                key={slotNum}
                p={3}
                borderRadius="md"
                borderWidth="2px"
                borderColor={filledByQR ? `${colorConfig.chakra}.solid` : isManual ? 'gray.solid' : 'border.muted'}
                bg={filledByQR ? `${colorConfig.chakra}.subtle` : isManual ? 'bg.subtle' : 'bg.panel'}
              >
                <Flex justify="space-between" align="center" gap={2}>
                  <HStack gap={2} flex={1} minW={0}>
                    {filledByQR ? (
                      <>
                        <Text fontSize="lg">{colorConfig.emoji}</Text>
                        <Text fontWeight="medium" lineClamp={1}>
                          {judge.name}
                        </Text>
                        <Badge colorPalette="green" size="sm">
                          ✓ Подключён
                        </Badge>
                      </>
                    ) : (
                      <>
                        <Text fontSize="lg">{colorConfig.emoji}</Text>
                        <Text fontWeight="medium" color="fg.muted">
                          Слот {slotNum} ({colorConfig.name})
                        </Text>
                      </>
                    )}
                  </HStack>

                  {/* Галочка «управляется вручную» — доступна только если слот не занят QR */}
                  {!filledByQR && (
                    <Checkbox.Root
                      checked={isManual}
                      disabled={pendingSlot === slotNum}
                      onCheckedChange={(e) => handleToggleManual(slotNum, Boolean(e.checked))}
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                      <Checkbox.Label fontSize="sm" color="fg.muted">
                        Вручную
                      </Checkbox.Label>
                    </Checkbox.Root>
                  )}
                </Flex>
              </Box>
            )
          })}
        </VStack>
      </SimpleGrid>

      {allFilled && (
        <Box textAlign="center" bg="green.subtle" p={4} borderRadius="xl" borderWidth="1px" borderColor="green.muted">
          <Text fontSize="lg" fontWeight="bold" color="green.fg">
            ✓ Все 5 слотов заполнены
          </Text>
          <Text fontSize="sm" color="fg.muted" mt={1}>
            Переход к следующему шагу автоматический
          </Text>
        </Box>
      )}
    </VStack>
  )
}
