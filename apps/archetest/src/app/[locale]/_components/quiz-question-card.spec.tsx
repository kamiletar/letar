import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, describe, expect, it, vi } from 'vitest'
import messages from '../../../../messages/ru.json'
import { QuizQuestionCard } from './quiz-question-card'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('Карточка восстановленного вопроса', () => {
  it.each([false, true])('позволяет продолжить без повторного выбора, последний=%s', (last) => {
    vi.useFakeTimers()
    const onNext = vi.fn()
    render(
      <ChakraProvider value={defaultSystem}>
        <NextIntlClientProvider locale="ru" messages={messages}>
          <QuizQuestionCard
            scenario="Восстановленный вопрос"
            options={[{ text: 'Сохранённый ответ', originalIndex: 0 }]}
            questionNumber={last ? 50 : 1}
            selectedOption={0}
            isLastQuestion={last}
            onAnswer={vi.fn()}
            onSkip={vi.fn()}
            onNext={onNext}
          />
        </NextIntlClientProvider>
      </ChakraProvider>,
    )
    act(() => vi.advanceTimersByTime(1000))
    expect(onNext).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: last ? messages.quiz.finish : messages.quiz.next }))
    expect(onNext).toHaveBeenCalledOnce()
  })
})
