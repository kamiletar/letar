import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import enMessages from '../../../../messages/en.json'
import ruMessages from '../../../../messages/ru.json'
import type { PersonalityTypeCode } from '../_data/personality-types'
import { PERSONALITY_TYPES } from '../_data/personality-types'
import { QuizResults } from './quiz-results'

const clinical = vi.hoisted(() => ({ value: false }))

vi.mock('@/app/_hooks/use-psychologist', () => ({ useShowClinicalNames: () => clinical.value }))
vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}))
// Тяжёлые дочерние блоки не относятся к проверяемым строкам
vi.mock('./personality-radar-chart', () => ({ PersonalityRadarChart: () => null }))
vi.mock('./hexagram-chart', () => ({ HexagramChart: () => null }))
vi.mock('./profile-details', () => ({ ProfileDetails: () => null }))
vi.mock('./psychologist-link-block', () => ({ PsychologistLinkBlock: () => null }))
vi.mock('./states-block', () => ({ StatesBlock: () => null }))
vi.mock('./safety-net-block', () => ({ SafetyNetBlock: () => null, DarkReassuranceNote: () => null }))
vi.mock('./share-result-button', () => ({ ShareResultButton: () => null }))
vi.mock('./achievement-card', () => ({ AchievementCard: () => null }))
vi.mock('./rank-badge', () => ({ RankBadge: () => null }))

const scores = Object.fromEntries(PERSONALITY_TYPES.map((t) => [t.code, 0])) as Record<PersonalityTypeCode, number>

function renderResults(locale: 'ru' | 'en', props: Partial<Parameters<typeof QuizResults>[0]> = {}) {
  const messages = locale === 'ru' ? ruMessages : enMessages
  return render(
    <ChakraProvider value={defaultSystem}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <QuizResults
          scores={{ ...scores, ...props.scores }}
          averagedScores={null}
          onRestart={() => undefined}
          onContinue={() => undefined}
          progress={{ totalAnswered: 630, totalQuestions: 2096, coveragePercent: 30, availableCount: 1466 }}
          xpCountedToday={false}
          {...props}
        />
      </NextIntlClientProvider>
    </ChakraProvider>,
  )
}

describe('QuizResults: строки интерфейса из messages', () => {
  it('RU: прогресс, кнопки, дисклеймер', () => {
    renderResults('ru')
    expect(screen.getByText('Пройдено: 630 из 2096 вопросов')).toBeTruthy()
    expect(screen.getByText('Ещё 1466 вопросов доступно для повышения точности')).toBeTruthy()
    expect(screen.getAllByText('Пройти ещё 50 вопросов').length).toBe(2)
    expect(screen.getByText('XP за сегодня уже получены — каждый новый ответ уточняет профиль')).toBeTruthy()
    expect(screen.getByText('Вернуться на главную')).toBeTruthy()
    expect(screen.getByText(/^Тест носит ориентировочный характер/)).toBeTruthy()
  })

  it('EN: прогресс, кнопки, дисклеймер', () => {
    renderResults('en')
    expect(screen.getByText('Completed: 630 of 2096 questions')).toBeTruthy()
    expect(screen.getByText('1466 more questions available for better accuracy')).toBeTruthy()
    expect(screen.getAllByText('Answer 50 more questions').length).toBe(2)
    expect(screen.getByText('Today’s XP is already earned — every new answer refines your profile')).toBeTruthy()
    expect(screen.getByText('Back to main')).toBeTruthy()
    expect(screen.getByText(/^This test is indicative/)).toBeTruthy()
  })

  it('число кнопки «ещё» ограничено доступными вопросами', () => {
    renderResults('ru', {
      progress: { totalAnswered: 2080, totalQuestions: 2096, coveragePercent: 99, availableCount: 16 },
    })
    expect(screen.getAllByText('Пройти ещё 16 вопросов').length).toBe(2)
  })

  it('предупреждение BAR: мягкая формулировка для пользователя, клиническая — для психолога', () => {
    clinical.value = false
    const user = renderResults('ru', { scores: { ...scores, BAR: 50 } })
    expect(screen.getByText(/^Заметна выраженная переменчивость настроения/)).toBeTruthy()
    user.unmount()

    clinical.value = true
    renderResults('en', { scores: { ...scores, BAR: 50, BOR: 45, DPR: 45 } })
    expect(screen.getByText(/^High bipolar scale score/)).toBeTruthy()
    expect(screen.getByText(/^High scores on both borderline and bipolar scales/)).toBeTruthy()
    expect(screen.getByText(/^Chronic pessimism \(DPR\)/)).toBeTruthy()
    clinical.value = false
  })

  it('шкалы с низкой достоверностью: заголовок и подсказка на обоих языках', () => {
    const confidence = Object.fromEntries(PERSONALITY_TYPES.map((t) => [t.code, 'low'])) as never
    const ru = renderResults('ru', { confidence })
    expect(screen.getByText('⚠ Шкалы с недостаточной точностью')).toBeTruthy()
    ru.unmount()
    renderResults('en', { confidence })
    expect(screen.getByText('⚠ Scales with insufficient accuracy')).toBeTruthy()
  })
})
