import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import messages from '../../../../messages/ru.json'
import type { QuizQuestionDTO } from '../_actions/quiz.action'
import { submitQuizAction } from '../_actions/quiz.action'
import { DISCLAIMER_CONSENT_KEY } from '../_data/disclaimer'
import { ExpressContainer } from './express-container'
import { KioskResetButton } from './kiosk-reset-button'
import { QuizContainer } from './quiz-container'

vi.mock('@/app/_components/ui/toaster', () => ({
  toaster: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))
vi.mock(
  '@letar/ui',
  () => ({ StickyActionBar: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }),
)
vi.mock('../_actions/quiz.action', () => ({ submitQuizAction: vi.fn(), getRandomQuestionsAction: vi.fn() }))
vi.mock('../_lib/client-scoring', () => ({ computeClientScores: () => ({ PAR: 50 }) }))
vi.mock('./quiz-intro', () => ({
  QuizIntro: ({ onStart }: { onStart: () => void }) => <button onClick={onStart}>Начать полный тест</button>,
}))
vi.mock('./mood-check-in', () => ({
  MoodCheckIn: ({ onSkip }: { onSkip: () => void }) => <button onClick={onSkip}>Пропустить настроение</button>,
}))
vi.mock('./quiz-progress-bar', () => ({
  QuizProgressBar: ({ current, answered }: { current: number; answered: number }) => (
    <div data-testid="progress">{current}:{answered}</div>
  ),
}))
vi.mock('./quiz-question-card', () => ({
  QuizQuestionCard: (props: {
    scenario: string
    selectedOption?: number
    onAnswer: (index: number) => void
    onNext: () => void
    onSkip: () => void
  }) => (
    <div>
      <div data-testid="scenario">{props.scenario}</div>
      <div data-testid="selected">{props.selectedOption ?? 'нет'}</div>
      <button onClick={() => props.onAnswer(1)}>Ответить</button>
      <button onClick={props.onNext}>Дальше</button>
      <button onClick={props.onSkip}>Пропустить вопрос</button>
    </div>
  ),
}))
vi.mock('./quiz-results', () => ({
  QuizResults: ({ onRestart }: { onRestart: () => void }) => <button onClick={onRestart}>Пройти заново</button>,
}))
vi.mock('./express-results', () => ({
  ExpressResults: ({ onRetake }: { onRetake: () => void }) => <button onClick={onRetake}>Пройти заново</button>,
}))
vi.mock('./icebreaker-card', () => ({ IcebreakerCard: () => null }))
vi.mock('./disclaimer-consent', () => ({ DisclaimerConsentCheckbox: () => null, DisclaimerSummary: () => null }))

function questions(prefix: string): QuizQuestionDTO[] {
  return Array.from({ length: 3 }, (_, index) => ({
    id: `${prefix}-${index}`,
    scenario: `${prefix}: вопрос ${index}`,
    scenarioEn: `${prefix}: question ${index}`,
    options: [0, 1, 2, 3].map((option) => ({ text: `Ответ ${option}`, textEn: `Answer ${option}`, scoring: {} })),
  }))
}

function mount(mode: 'full' | 'express', prefix = 'исходные', userId: string | null = null) {
  return render(
    <ChakraProvider value={defaultSystem}>
      <NextIntlClientProvider locale="ru" messages={messages}>
        {mode === 'full'
          ? (
            <QuizContainer
              questions={questions(prefix)}
              isAuthenticated={!!userId}
              userId={userId}
              initialProgress={null}
            />
          )
          : <ExpressContainer questions={questions(prefix)} isAuthenticated={!!userId} userId={userId} />}
        {mode === 'express' && <KioskResetButton />}
      </NextIntlClientProvider>
    </ChakraProvider>,
  )
}

function start(mode: 'full' | 'express') {
  fireEvent.click(screen.getByRole('button', { name: mode === 'full' ? 'Начать полный тест' : messages.express.start }))
  if (mode === 'full') { fireEvent.click(screen.getByRole('button', { name: 'Пропустить настроение' })) }
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  localStorage.setItem(DISCLAIMER_CONSENT_KEY, '1')
  vi.mocked(submitQuizAction).mockReset()
})

afterEach(cleanup)

describe.each(['full', 'express'] as const)('Восстановление %s', (mode) => {
  it.each([null, 'user-1'])('переживает закрытие вкладки у %s и сохраняет исходную выборку', (userId) => {
    const view = mount(mode, 'исходные', userId)
    start(mode)
    fireEvent.click(screen.getByRole('button', { name: 'Ответить' }))
    fireEvent.click(screen.getByRole('button', { name: 'Дальше' }))
    fireEvent.click(screen.getByRole('button', { name: 'Пропустить вопрос' }))
    fireEvent.click(screen.getByRole('button', { name: 'Дальше' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ответить' }))
    const lastScenario = screen.getByTestId('scenario').textContent
    view.unmount()
    sessionStorage.clear()

    mount(mode, 'новая серверная выборка', userId)
    expect(screen.getByTestId('scenario')).toHaveTextContent(lastScenario!)
    expect(screen.getByTestId('selected')).toHaveTextContent('1')
    expect(screen.getByTestId('progress')).toHaveTextContent('2:2')
    expect(submitQuizAction).not.toHaveBeenCalled()
  })

  it('сохраняет ответ синхронно до автоперехода и восстанавливает его после входа', () => {
    const view = mount(mode)
    start(mode)
    fireEvent.click(screen.getByRole('button', { name: 'Ответить' }))
    const scenario = screen.getByTestId('scenario').textContent
    view.unmount()
    mount(mode, 'новые вопросы после входа', 'user-1')
    expect(screen.getByTestId('scenario')).toHaveTextContent(scenario!)
    expect(screen.getByTestId('selected')).toHaveTextContent('1')
    expect(submitQuizAction).not.toHaveBeenCalled()
  })

  it('не восстанавливает личный черновик другого аккаунта', () => {
    const view = mount(mode, 'личные вопросы', 'user-1')
    start(mode)
    fireEvent.click(screen.getByRole('button', { name: 'Ответить' }))
    view.unmount()
    mount(mode, 'другие вопросы', 'user-2')
    expect(screen.queryByTestId('scenario')).not.toBeInTheDocument()
  })

  it('после завершения и нового старта не возвращает старый черновик', async () => {
    vi.mocked(submitQuizAction).mockResolvedValue({ error: 'network_error' })
    const view = mount(mode)
    start(mode)
    for (let index = 0; index < 3; index++) {
      fireEvent.click(screen.getByRole('button', { name: 'Ответить' }))
      fireEvent.click(screen.getByRole('button', { name: 'Дальше' }))
    }
    fireEvent.click(await screen.findByRole('button', { name: 'Пройти заново' }))
    view.unmount()
    mount(mode, 'новый тест')
    expect(screen.queryByTestId('scenario')).not.toBeInTheDocument()
  })
})

describe('Очередь отправки полного теста', () => {
  it('старую незавершённую очередь не отправляет автоматически', () => {
    sessionStorage.setItem(
      'quiz_pending',
      JSON.stringify({ seed: 42, answers: [{ questionId: 'q1', selectedOption: 0 }] }),
    )
    mount('full', 'вопросы', 'user-1')
    expect(submitQuizAction).not.toHaveBeenCalled()
  })

  it('при сетевой ошибке сохраняет завершённую очередь для следующего входа', async () => {
    const pending = {
      completed: true,
      seed: 42,
      answers: [{ questionId: 'q1', selectedOption: 0 }],
      skipped: [],
      mood: null,
    }
    sessionStorage.setItem('quiz_pending', JSON.stringify(pending))
    vi.mocked(submitQuizAction).mockRejectedValue(new Error('offline'))
    mount('full', 'вопросы', 'user-1')
    expect(await screen.findByRole('button', { name: 'Начать полный тест' })).toBeInTheDocument()
    expect(submitQuizAction).toHaveBeenCalledOnce()
    expect(JSON.parse(sessionStorage.getItem('quiz_pending')!)).toEqual(pending)
  })
})
