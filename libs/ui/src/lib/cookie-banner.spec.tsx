import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createConsentConfig } from './consent-types'
import { CookieBanner } from './cookie-banner'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('CookieBanner', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('показывается, если в localStorage ещё нет согласия', () => {
    renderWithProvider(<CookieBanner appKey="test-app" />)
    expect(screen.getByText(/Мы используем cookie/)).toBeInTheDocument()
  })

  it('не показывается, если согласие уже сохранено под текущей версией политики', () => {
    const { storageKey } = createConsentConfig('test-app', 'v1')
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        necessary: true,
        analytics: true,
        marketing: false,
        version: 'v1',
        acceptedAt: new Date().toISOString(),
      }),
    )
    renderWithProvider(<CookieBanner appKey="test-app" policyVersion="v1" />)
    expect(screen.queryByText(/Мы используем cookie/)).not.toBeInTheDocument()
  })

  it('показывается снова, если версия политики в localStorage устарела', () => {
    const { storageKey } = createConsentConfig('test-app', 'v1')
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        necessary: true,
        analytics: true,
        marketing: false,
        version: 'v1',
        acceptedAt: new Date().toISOString(),
      }),
    )
    renderWithProvider(<CookieBanner appKey="test-app" policyVersion="v2" />)
    expect(screen.getByText(/Мы используем cookie/)).toBeInTheDocument()
  })

  it('ссылка «Подробнее в политике ПДн» ведёт на privacyUrl', () => {
    renderWithProvider(<CookieBanner appKey="test-app" privacyUrl="/custom-privacy" />)
    const link = screen.getByRole('link', { name: 'Подробнее в политике ПДн' })
    expect(link).toHaveAttribute('href', '/custom-privacy')
  })

  it('чекбоксы скрыты по умолчанию — видны только после «Настроить»', async () => {
    const user = userEvent.setup()
    renderWithProvider(<CookieBanner appKey="test-app" />)
    expect(screen.queryByRole('checkbox', { name: /Необходимые/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Настроить' }))

    const necessaryCheckbox = screen.getByRole('checkbox', { name: /Необходимые/ })
    expect(necessaryCheckbox).toBeChecked()
    expect(necessaryCheckbox).toBeDisabled()
  })

  it('«Принять все» сохраняет analytics и marketing = true, скрывает баннер, шлёт POST', async () => {
    const user = userEvent.setup()
    const { storageKey, consentChangeEvent } = createConsentConfig('test-app', 'v1')
    const listener = vi.fn()
    window.addEventListener(consentChangeEvent, listener)

    renderWithProvider(<CookieBanner appKey="test-app" policyVersion="v1" consentApiUrl="/api/consent" />)
    await user.click(screen.getByRole('button', { name: 'Принять все' }))

    const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? 'null')
    expect(saved).toMatchObject({ necessary: true, analytics: true, marketing: true, version: 'v1' })
    expect(screen.queryByText(/Мы используем cookie/)).not.toBeInTheDocument()
    expect(listener).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(
      '/api/consent',
      expect.objectContaining({ method: 'POST' }),
    )

    window.removeEventListener(consentChangeEvent, listener)
  })

  it('«Сохранить выбор» пишет только отмеченные категории', async () => {
    const user = userEvent.setup()
    const { storageKey } = createConsentConfig('test-app', 'v1')

    renderWithProvider(
      <CookieBanner appKey="test-app" policyVersion="v1" analyticsLabel="Аналитика" marketingLabel="Маркетинг" />,
    )

    await user.click(screen.getByRole('button', { name: 'Настроить' }))
    await user.click(screen.getByRole('checkbox', { name: 'Аналитика' }))
    await user.click(screen.getByRole('button', { name: 'Сохранить выбор' }))

    const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? 'null')
    expect(saved).toMatchObject({ necessary: true, analytics: true, marketing: false, version: 'v1' })
    expect(screen.queryByText(/Мы используем cookie/)).not.toBeInTheDocument()
  })

  it('не отправляет POST при consentApiUrl=null', async () => {
    const user = userEvent.setup()
    renderWithProvider(<CookieBanner appKey="test-app" consentApiUrl={null} />)
    await user.click(screen.getByRole('button', { name: 'Принять все' }))
    expect(fetch).not.toHaveBeenCalled()
  })

  it('открывается заново по событию openSettingsEvent, если согласие уже было сохранено при монтировании', async () => {
    // ⚠️ Обработчик openSettingsEvent регистрируется в CookieBanner только внутри ветки
    // useEffect, где localStorage.getItem(storageKey) уже что-то вернул при монтировании —
    // при пустом localStorage эффект делает ранний `return` до window.addEventListener.
    // Поэтому сценарий «принял согласие → тут же открыл настройки cookie без перезагрузки
    // страницы» в текущей реализации не работает (см. итоговый отчёт задачи — возможный баг).
    // Здесь проверяем случай, где это действительно работает: согласие уже было в localStorage
    // на момент монтирования (типичная повторная загрузка страницы).
    const { storageKey, openSettingsEvent } = createConsentConfig('test-app', 'v1')
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        necessary: true,
        analytics: true,
        marketing: false,
        version: 'v1',
        acceptedAt: new Date().toISOString(),
      }),
    )

    renderWithProvider(<CookieBanner appKey="test-app" policyVersion="v1" />)
    expect(screen.queryByText(/Мы используем cookie/)).not.toBeInTheDocument()

    await act(async () => {
      window.dispatchEvent(new Event(openSettingsEvent))
    })

    await waitFor(() => {
      expect(screen.getByText(/Мы используем cookie/)).toBeInTheDocument()
    })
  })
})
