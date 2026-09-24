import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactElement, ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import enMessages from '../../../../messages/en.json'
import ruMessages from '../../../../messages/ru.json'
import { SAFETY_NET_COPY } from '../_data/crisis-resources'
import { DISCLAIMER_SUMMARY_EN, DISCLAIMER_SUMMARY_RU } from '../_data/disclaimer'
import { DisclaimerConsentCheckbox, DisclaimerSummary } from './disclaimer-consent'
import { MoodCheckIn } from './mood-check-in'
import { ProfessionalLeadForm } from './professional-lead-form'
import { DarkReassuranceNote, SafetyNetBlock } from './safety-net-block'

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}))
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }))
vi.mock('../_actions/professional-lead.action', () => ({ submitProfessionalLeadAction: vi.fn() }))
vi.mock('@/app/_components/ui/toaster', () => ({ toaster: { create: vi.fn() } }))
// Баррель @letar/ui тянет next/*: для MoodCheckIn достаточно простых обёрток
vi.mock('@letar/ui', () => ({
  Pressable: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>{children}</button>
  ),
  StickyActionBar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))
// Форма @letar/forms вне предмета теста — только разметка полей и кнопки с их подписями
vi.mock('@/archetest-form', () => {
  const Form = ({ children }: { children: ReactNode }) => <form>{children}</form>
  Form.Field = { String: ({ label }: { label: string }) => <label>{label}</label> }
  Form.Button = { Submit: ({ children }: { children: ReactNode }) => <button type="submit">{children}</button> }
  return { ArchetestForm: Form }
})

function renderIn(locale: 'ru' | 'en', ui: ReactElement) {
  const onError = vi.fn()
  const view = render(
    <ChakraProvider value={defaultSystem}>
      <NextIntlClientProvider locale={locale} messages={locale === 'ru' ? ruMessages : enMessages} onError={onError}>
        {ui}
      </NextIntlClientProvider>
    </ChakraProvider>,
  )
  return { ...view, onError }
}

const all = () => (
  <>
    <SafetyNetBlock />
    <DarkReassuranceNote />
    <DisclaimerSummary />
    <DisclaimerConsentCheckbox accepted={false} onChange={() => undefined} />
    <MoodCheckIn onSubmit={() => undefined} onSkip={() => undefined} />
    <ProfessionalLeadForm />
  </>
)

describe('компоненты без пропа isRu: локаль из next-intl', () => {
  it.each(['ru', 'en'] as const)('%s: без MISSING_MESSAGE и сырых ключей', (locale) => {
    const { onError, container } = renderIn(locale, all())
    expect(onError).not.toHaveBeenCalled()
    expect(container.textContent).not.toMatch(/(disclaimer|moodCheckIn|leadForm)\.\w/)
  })

  it('RU: данные справочников и строки messages — на русском, ссылки из t.rich', () => {
    renderIn('ru', all())
    expect(screen.getByText(SAFETY_NET_COPY.title.ru)).toBeTruthy()
    expect(screen.getByText(new RegExp(DISCLAIMER_SUMMARY_RU))).toBeTruthy()
    expect(screen.getByRole('link', { name: 'политикой конфиденциальности' }).getAttribute('href')).toBe('/privacy')
    expect(screen.getByRole('link', { name: 'политикой обработки персональных данных' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Как вы сейчас?' })).toBeTruthy()
    expect(screen.getByText('Оставить заявку')).toBeTruthy()
  })

  it('EN: то же на английском — компонент сам взял локаль', () => {
    renderIn('en', all())
    expect(screen.getByText(SAFETY_NET_COPY.title.en)).toBeTruthy()
    expect(screen.getByText(new RegExp(DISCLAIMER_SUMMARY_EN))).toBeTruthy()
    expect(screen.getByRole('link', { name: 'privacy policy' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'personal data processing policy' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'How are you feeling?' })).toBeTruthy()
    expect(screen.getByText('Submit request')).toBeTruthy()
  })
})
