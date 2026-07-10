'use client'

/**
 * Быстрый ручной ввод оценок судей — блоки 1-5 по каждому судье.
 *
 * Счетовод видит судей списком (по одному в строку) с кнопками 1-5 в каждой строке.
 * Клик по цифре вызывает enterManualVoteAction (перезаписывает предыдущий голос).
 * Выбранная оценка визуально выделена (solid). Повторный клик на ту же оценку
 * для судьи с телефоном отменяет её (resetJudgeVoteAction).
 *
 * Горячие клавиши: 1-5 заполняют ручные слоты (без цвета) слева направо.
 * Судьи с телефоном не заполняются с клавиатуры.
 */

import type { MatchSSEState } from '@/app/_hooks/use-match-sse'
import { JUDGE_COLORS } from '@/lib/judge-colors'
import { Box, Flex, Text, VStack } from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { enterManualVoteAction, resetJudgeVoteAction } from '../_actions/scorer.action'

interface ScorerVoteInputProps {
  matchId: string
  performanceId: string
  /** Измерение: текст или подача */
  dimension: 'TEXT' | 'DELIVERY'
  /** Подключённые судьи (из matchState) */
  judges: MatchSSEState['judges']
  /** Колбэк — вызывается при каждом изменении оценок (judgeNumber → score | null) */
  onScoresChange?: (scores: Record<number, number | null>) => void
}

export function ScorerVoteInput({ matchId, performanceId, dimension, judges, onScoresChange }: ScorerVoteInputProps) {
  // Локально выбранные оценки (judgeNumber → score | null)
  const [selectedScores, setSelectedScores] = useState<Record<number, number | null>>({})
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  // Сбрасываем локальный стейт при смене выступления
  useEffect(() => {
    setSelectedScores({})
    setError(null)
    onScoresChange?.({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [performanceId, dimension])

  // Refs для актуальных значений в обработчике клавиш (не нужно перерегистрировать listener)
  const selectedScoresRef = useRef(selectedScores)
  selectedScoresRef.current = selectedScores

  const handleVote = useCallback(
    async (judge: MatchSSEState['judges'][number], score: number) => {
      const isPhoneJudge = !!judge.color
      const currentSelected = selectedScoresRef.current[judge.judgeNumber]
      const key = `${judge.judgeNumber}-${score}`

      // Для судьи с телефоном: повторный клик на ту же оценку отменяет её
      if (isPhoneJudge && currentSelected === score) {
        setLoadingKey(key)
        setError(null)
        const res = await resetJudgeVoteAction(matchId, performanceId, judge.judgeNumber, dimension)
        setLoadingKey(null)
        if (!res.success) {
          setError(res.error ?? 'Не удалось отменить оценку')
          return
        }
        setSelectedScores((prev) => {
          const next = { ...prev, [judge.judgeNumber]: null }
          onScoresChange?.(next)
          return next
        })
        startTransition(() => {})
        return
      }

      // Обычный ввод / изменение оценки
      setLoadingKey(key)
      setError(null)
      const res = await enterManualVoteAction(matchId, performanceId, judge.judgeNumber, dimension, score)
      setLoadingKey(null)
      if (!res.success) {
        setError(res.error ?? 'Не удалось записать оценку')
        return
      }
      setSelectedScores((prev) => {
        const next = { ...prev, [judge.judgeNumber]: score }
        onScoresChange?.(next)
        return next
      })
      startTransition(() => {})
    },
    [matchId, performanceId, dimension]
  )

  // Ref для handleVote — чтобы не перерегистрировать слушатель клавиш при каждом рендере
  const handleVoteRef = useRef(handleVote)
  handleVoteRef.current = handleVote

  // Горячие клавиши: 1-5 заполняют ручные слоты слева направо.
  // Используем refs чтобы listener регистрировался один раз при монтировании
  // и при смене judges — не нужно пересоздавать на каждый selectedScores.
  useEffect(() => {
    // color === null или undefined → ручной слот (зависит от версии SSE)
    const manualJudges = judges.filter((j) => !j.color)

    const onKeyDown = (e: KeyboardEvent) => {
      // Не перехватываем если фокус в input/textarea/select
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      // Только цифры 1-5 (isNaN защищает от стрелок и других клавиш)
      const score = parseInt(e.key, 10)
      if (isNaN(score) || score < 1 || score > 5) return

      // Первый ручной судья без выбранной оценки (берём из ref — всегда актуально)
      const target = manualJudges.find((j) => !selectedScoresRef.current[j.judgeNumber])
      if (!target) return

      e.preventDefault()
      void handleVoteRef.current(target, score)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [judges])

  if (judges.length === 0) {
    return (
      <Box p={3} borderRadius="md" bg="orange.subtle" borderWidth={1} borderColor="orange.muted">
        <Text fontSize="sm" color="orange.fg">
          Нет подключённых судей. Генерируйте QR-код и дождитесь подключения, либо назначьте судей вручную.
        </Text>
      </Box>
    )
  }

  const hasManualJudges = judges.some((j) => j.color === null)

  return (
    <VStack gap={3} align="stretch">
      {error && (
        <Text fontSize="sm" color="red.fg">
          {error}
        </Text>
      )}
      {hasManualJudges && (
        <Text fontSize="xs" color="fg.muted">
          Клавиши 1–5 — быстрый ввод для ручных судей по очереди
        </Text>
      )}
      {judges.map((judge) => {
        const colorConfig = judge.color ? JUDGE_COLORS[judge.color] : null
        const isPhoneJudge = !!judge.color
        const chakra = colorConfig?.chakra ?? 'gray'
        const label = colorConfig ? `${colorConfig.emoji} ${judge.name}` : `✋ Слот ${judge.judgeNumber}`
        const selectedScore = selectedScores[judge.judgeNumber] ?? null

        return (
          <Box
            key={judge.judgeNumber}
            px={2}
            py={2}
            borderRadius="lg"
            borderWidth={2}
            borderColor={isPhoneJudge ? `${chakra}.solid` : judge.hasVoted ? 'green.solid' : 'border.muted'}
            bg={isPhoneJudge ? `${chakra}.subtle` : judge.hasVoted ? 'green.subtle' : 'bg.panel'}
          >
            <Flex gap={2} align="center">
              {/* Номер судьи — маленький, слева */}
              <Text
                fontSize="xs"
                fontWeight="bold"
                color={isPhoneJudge ? `${chakra}.fg` : 'fg.muted'}
                minW="4"
                textAlign="center"
              >
                {judge.judgeNumber}
              </Text>
              {[1, 2, 3, 4, 5].map((score) => {
                const key = `${judge.judgeNumber}-${score}`
                const isSelected = selectedScore === score
                const isLoading = loadingKey === key
                // Блокируем только кнопки текущего судьи пока идёт его запрос
                const isJudgeLoading = loadingKey?.startsWith(`${judge.judgeNumber}-`) ?? false
                const accent = chakra !== 'gray' ? chakra : 'green'

                return (
                  <Box
                    key={score}
                    flex={1}
                    py={4}
                    borderRadius="md"
                    borderWidth={2}
                    textAlign="center"
                    fontSize="xl"
                    fontWeight="bold"
                    cursor={isJudgeLoading ? 'wait' : 'pointer'}
                    userSelect="none"
                    transition="all 0.15s"
                    borderColor={isSelected ? `${accent}.solid` : 'border.muted'}
                    bg={isSelected ? `${accent}.solid` : 'bg.subtle'}
                    color={isSelected ? 'white' : 'fg'}
                    opacity={isJudgeLoading && !isLoading ? 0.4 : 1}
                    _hover={
                      isJudgeLoading
                        ? {}
                        : {
                            borderColor: `${accent}.solid`,
                            bg: isSelected ? `${accent}.solid` : `${accent}.subtle`,
                          }
                    }
                    onClick={() => {
                      if (!isJudgeLoading) void handleVote(judge, score)
                    }}
                  >
                    {isLoading ? '…' : score}
                  </Box>
                )
              })}
            </Flex>
          </Box>
        )
      })}
    </VStack>
  )
}
