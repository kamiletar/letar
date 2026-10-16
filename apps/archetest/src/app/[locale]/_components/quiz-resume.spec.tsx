import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import messages from '../../../../messages/ru.json'
import type { QuizQuestionDTO } from '../_actions/quiz.action'
import { submitQuizAction } from '../_actions/quiz.action'
import { DISCLAIMER_CONSENT_KEY } from '../_data/disclaimer'
import { readQuizDraft, saveQuizDraft } from '../_lib/quiz-draft'
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
vi.mock('../_lib/client-scoring', async (importOriginal) => ({
  ...await importOriginal<typeof import('../_lib/client-scoring')>(),
  computeClientScores: () => ({ PAR: 50 }),
}))
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
  if (mode === 'full') {
    fireEvent.click(screen.getByRole('button', { name: 'Продолжить', exact: true }))
    fireEvent.click(screen.getByRole('button', { name: 'Пропустить настроение' }))
  }
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  localStorage.setItem(DISCLAIMER_CONSENT_KEY, '1')
  vi.mocked(submitQuizAction).mockReset()
})

afterEach(cleanup)

describe('Инструкция перед полным тестом', () => {
  it('после начала показывает инструкцию и вход, после продолжения — настроение', () => {
    mount('full')
    fireEvent.click(screen.getByRole('button', { name: 'Начать полный тест' }))
    expect(screen.getByRole('heading', { name: 'Как проходить тест' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Войти или создать аккаунт' })).toHaveAttribute(
      'href',
      '/sign-in?callbackURL=%2F%23quiz-guidance',
    )
    expect(screen.queryByRole('button', { name: 'Пропустить настроение' })).not.toBeInTheDocument()
    expect(submitQuizAction).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Продолжить', exact: true }))
    expect(screen.getByRole('button', { name: 'Пропустить настроение' })).toBeInTheDocument()
  })

  it('после входа возвращается к инструкции без гостевого напоминания', () => {
    const guest = mount('full')
    fireEvent.click(screen.getByRole('button', { name: 'Начать полный тест' }))
    guest.unmount()
    mount('full', 'новые вопросы', 'user-1')
    expect(screen.getByRole('heading', { name: 'Как проходить тест' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Войти или создать аккаунт' })).not.toBeInTheDocument()
    expect(submitQuizAction).not.toHaveBeenCalled()
  })
})

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
  const savedResult = {
    data: {
      scores: { normalized: { PAR: 65 }, confidence: { PAR: 'high' }, relevantCounts: { PAR: 3 } },
      averagedScores: null,
      newAchievements: [],
      rankInfo: null,
    },
  } as Awaited<ReturnType<typeof submitQuizAction>>

  function finishAsGuest() {
    const view = mount('full')
    start('full')
    for (let index = 0; index < 3; index++) {
      fireEvent.click(screen.getByRole('button', { name: 'Ответить' }))
      fireEvent.click(screen.getByRole('button', { name: 'Дальше' }))
    }
    view.unmount()
  }

  it('возвращает гостя к завершённым результатам после отмены входа или перезагрузки', async () => {
    finishAsGuest()
    mount('full', 'новая выборка')
    expect(await screen.findByRole('button', { name: 'Пройти заново' })).toBeInTheDocument()
    expect(submitQuizAction).not.toHaveBeenCalled()
  })

  it('после регистрации сохраняет гостевые ответы и показывает результаты', async () => {
    finishAsGuest()
    const pending = JSON.parse(sessionStorage.getItem('quiz_pending')!)
    vi.mocked(submitQuizAction).mockResolvedValue(savedResult)
    mount('full', 'новая выборка', 'new-user')
    expect(await screen.findByRole('button', { name: 'Пройти заново' })).toBeInTheDocument()
    expect(submitQuizAction).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      seed: pending.seed,
      answers: pending.answers,
    }))
    expect(sessionStorage.getItem('quiz_pending')).toBeNull()
  })

  it('при ошибке сохранения остаётся на результатах и закрепляет очередь за вошедшим аккаунтом', async () => {
    finishAsGuest()
    vi.mocked(submitQuizAction).mockRejectedValue(new Error('offline'))
    const view = mount('full', 'новые вопросы', 'user-1')
    expect(await screen.findByRole('button', { name: 'Пройти заново' })).toBeInTheDocument()
    expect(JSON.parse(sessionStorage.getItem('quiz_pending')!).userId).toBe('user-1')
    view.unmount()
    mount('full', 'чужие вопросы', 'user-2')
    expect(screen.queryByRole('button', { name: 'Пройти заново' })).not.toBeInTheDocument()
    expect(submitQuizAction).toHaveBeenCalledOnce()
  })

  it('завершённый гостевой результат не вытесняется личным незавершённым тестом', async () => {
    const personal = mount('full', 'личная выборка', 'user-1')
    start('full')
    fireEvent.click(screen.getByRole('button', { name: 'Ответить' }))
    personal.unmount()
    const draft = readQuizDraft('full', 'user-1')!
    saveQuizDraft('full', 'user-1', { ...draft, seed: 7 })
    finishAsGuest()
    vi.mocked(submitQuizAction).mockRejectedValue(new Error('offline'))
    mount('full', 'новые вопросы', 'user-1')
    expect(await screen.findByRole('button', { name: 'Пройти заново' })).toBeInTheDocument()
    expect(submitQuizAction).toHaveBeenCalledOnce()
    expect(readQuizDraft('full', 'user-1')?.seed).toBe(7)
    const pending = JSON.parse(sessionStorage.getItem('quiz_pending')!)
    vi.mocked(submitQuizAction).mockResolvedValue(savedResult)
    fireEvent.click(screen.getByRole('button', { name: messages.quiz.container.retry }))
    await screen.findByRole('button', { name: 'Пройти заново' })
    expect(submitQuizAction).toHaveBeenLastCalledWith(expect.objectContaining({
      seed: pending.seed,
      answers: pending.answers,
    }))
    expect(sessionStorage.getItem('quiz_pending')).toBeNull()
    expect(readQuizDraft('full', 'user-1')?.seed).toBe(7)
  })

  it('гостевая очередь экспресса не блокирует незавершённый полный тест', () => {
    const view = mount('full')
    start('full')
    fireEvent.click(screen.getByRole('button', { name: 'Ответить' }))
    const scenario = screen.getByTestId('scenario').textContent
    view.unmount()
    sessionStorage.setItem(
      'quiz_pending',
      JSON.stringify({
        completed: true,
        mode: 'express',
        seed: 42,
        answers: [{ questionId: 'express-1', selectedOption: 0 }],
      }),
    )
    mount('full', 'новые вопросы')
    expect(screen.getByTestId('scenario')).toHaveTextContent(scenario!)
    expect(submitQuizAction).not.toHaveBeenCalled()
  })

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
    expect(JSON.parse(sessionStorage.getItem('quiz_pending')!)).toEqual(
      expect.objectContaining({ ...pending, userId: 'user-1' }),
    )
  })
})
