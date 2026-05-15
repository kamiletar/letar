'use client'

import { Box, Button, Flex, HStack, Progress, Text, VStack } from '@chakra-ui/react'
import { Children, type KeyboardEvent, type ReactElement, type ReactNode, useCallback, useRef } from 'react'
import { useConversationalState } from './use-conversational-state'

/** Props для ConversationalMode */
export interface ConversationalModeProps {
  /** Дочерние элементы — поля формы (каждый ребёнок = один шаг) */
  children: ReactNode
  /** Welcome screen перед первым полем */
  welcomeScreen?: ReactNode
  /** Thank you screen после последнего поля */
  completedScreen?: ReactNode
  /** Текст кнопки далее */
  nextLabel?: string
  /** Текст кнопки назад */
  prevLabel?: string
  /** Текст кнопки отправки (на последнем шаге) */
  submitLabel?: string
  /** Показывать номер вопроса */
  showQuestionNumber?: boolean
  /** Показывать progress bar */
  showProgress?: boolean
  /** Callback при завершении */
  onComplete?: () => void
}

/**
 * Conversational Mode — Typeform-стиль.
 *
 * Одно поле за раз, Enter → следующее, стрелки для навигации.
 * Оборачивает дочерние элементы формы в пошаговый UI.
 *
 * @example
 * ```tsx
 * <Form initialValue={data} onSubmit={handleSubmit}>
 *   <ConversationalMode
 *     showProgress
 *     showQuestionNumber
 *     completedScreen={<Text>Спасибо!</Text>}
 *   >
 *     <Form.Field.String name="name" label="Как вас зовут?" />
 *     <Form.Field.String name="email" label="Ваш email?" />
 *     <Form.Field.YesNo name="subscribe" label="Подписаться?" />
 *   </ConversationalMode>
 * </Form>
 * ```
 */
export function ConversationalMode({
  children,
  welcomeScreen,
  completedScreen,
  nextLabel = 'Далее',
  prevLabel = 'Назад',
  submitLabel = 'Отправить',
  showQuestionNumber = true,
  showProgress = true,
  onComplete,
}: ConversationalModeProps): ReactElement {
  const childArray = Children.toArray(children)
  const state = useConversationalState(childArray.length)
  const containerRef = useRef<HTMLDivElement>(null)

  /** Обработка клавиш */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        // Enter без Shift → следующее поле (кроме textarea)
        const target = e.target as HTMLElement
        if (target.tagName === 'TEXTAREA') return
        e.preventDefault()
        if (state.isLast) {
          onComplete?.()
        } else {
          state.next()
        }
      }
      if (e.key === 'ArrowUp' && e.altKey) {
        e.preventDefault()
        state.prev()
      }
      if (e.key === 'ArrowDown' && e.altKey) {
        e.preventDefault()
        state.next()
      }
    },
    [state, onComplete]
  )

  // Завершённое состояние
  if (state.isCompleted) {
    return (
      <VStack minH="300px" justify="center" align="center" gap={4} py={12}>
        {completedScreen ?? <Text fontSize="lg">Готово!</Text>}
      </VStack>
    )
  }

  const currentChild = childArray[state.currentIndex]

  return (
    <VStack gap={6} align="stretch" ref={containerRef} onKeyDown={handleKeyDown}>
      {/* Progress bar */}
      {showProgress && (
        <Progress.Root value={state.progress * 100} size="xs" colorPalette="blue">
          <Progress.Track>
            <Progress.Range />
          </Progress.Track>
        </Progress.Root>
      )}

      {/* Номер вопроса */}
      {showQuestionNumber && (
        <Text fontSize="sm" color="fg.muted">
          Вопрос {state.currentIndex + 1} из {state.totalFields}
        </Text>
      )}

      {/* Текущее поле с анимацией */}
      <Box
        key={state.currentIndex}
        minH="150px"
        py={4}
        css={{
          animation: 'fadeInUp 0.3s ease-out',
          '@keyframes fadeInUp': {
            from: { opacity: 0, transform: 'translateY(20px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
        }}
      >
        {currentChild}
      </Box>

      {/* Навигация */}
      <Flex justify="space-between" pt={2}>
        <Button variant="ghost" onClick={state.prev} disabled={state.isFirst} size="sm">
          ← {prevLabel}
        </Button>
        <HStack gap={2}>
          <Text fontSize="xs" color="fg.muted">
            Enter ↵
          </Text>
          {state.isLast ? (
            <Button colorPalette="blue" onClick={onComplete} size="sm">
              {submitLabel}
            </Button>
          ) : (
            <Button colorPalette="blue" onClick={state.next} size="sm">
              {nextLabel} →
            </Button>
          )}
        </HStack>
      </Flex>
    </VStack>
  )
}
