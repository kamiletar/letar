import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import enMessages from '../../../../../messages/en.json'
import ruMessages from '../../../../../messages/ru.json'
import { CORE_SCALE_COUNT, TOTAL_QUESTIONS } from '../../_data/bank-stats'
import { ForProfessionalsView } from './for-professionals-view'

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}))
// Баррель @letar/ui тянет next/* и в vitest не резолвится (приложение берёт его через paths Next)
vi.mock('@letar/ui', () => ({
  TouchLink: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}))
// Лид-форма — отдельный клиентский компонент со своим тестом, здесь не нужна
vi.mock('../../_components/professional-lead-form', () => ({ ProfessionalLeadForm: () => null }))

function renderView(locale: 'ru' | 'en') {
  const messages = locale === 'ru' ? ruMessages : enMessages
  const onError = vi.fn()
  const view = render(
    <ChakraProvider value={defaultSystem}>
      <NextIntlClientProvider locale={locale} messages={messages} onError={onError}>
        <ForProfessionalsView locale={locale} />
      </NextIntlClientProvider>
    </ChakraProvider>,
  )
  return { ...view, onError }
}

describe('ForProfessionalsView: строки из messages', () => {
  it.each(['ru', 'en'] as const)('%s: ни одного отсутствующего ключа или ошибки ICU', (locale) => {
    const { onError, container } = renderView(locale)
    expect(onError).not.toHaveBeenCalled()
    // Сырой ключ next-intl выводит как «forProfessionals.x.y»
    expect(container.textContent).not.toMatch(/forProfessionals\./)
  })

  it('RU: заголовки, подстановки чисел, списки, ссылка из t.rich', () => {
    renderView('ru')
    expect(screen.getByRole('heading', { name: 'Если вы психолог' })).toBeTruthy()
    expect(screen.getByText(new RegExp(`${TOTAL_QUESTIONS} вопросов, ${CORE_SCALE_COUNT} шкалы`))).toBeTruthy()
    expect(screen.getByText(new RegExp(`Валидированное ядро — ${CORE_SCALE_COUNT - 1} из ${CORE_SCALE_COUNT}`)))
      .toBeTruthy()
    expect(screen.getByText('• Отстранённость — SZD, AVD, PAR')).toBeTruthy()
    expect(screen.getByText('• Личным заметкам о клиенте (видны только вам)')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'странице кабинета' }).getAttribute('href')).toBe('/cabinet')
    expect(screen.getByText('Hilbig et al., 2021 (ответ на критику)')).toBeTruthy()
  })

  it('EN: те же места на английском', () => {
    renderView('en')
    expect(screen.getByRole('heading', { name: 'For Clinicians' })).toBeTruthy()
    expect(screen.getByText(new RegExp(`${TOTAL_QUESTIONS} items, ${CORE_SCALE_COUNT} scales`))).toBeTruthy()
    expect(screen.getByText('• Detachment — SZD, AVD, PAR')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'cabinet page' }).getAttribute('href')).toBe('/cabinet')
    expect(screen.getByText('Hilbig et al., 2021 (reply)')).toBeTruthy()
  })
})
