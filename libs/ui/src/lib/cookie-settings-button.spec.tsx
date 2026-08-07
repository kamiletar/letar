import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createConsentConfig } from './consent-types'
import { CookieSettingsButton } from './cookie-settings-button'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('CookieSettingsButton', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('рендерит кнопку с текстом «Настройки cookie»', () => {
    renderWithProvider(<CookieSettingsButton appKey="test-app" />)
    expect(screen.getByRole('button', { name: 'Настройки cookie' })).toBeInTheDocument()
  })

  it('диспатчит событие openSettingsEvent для appKey при клике', async () => {
    const user = userEvent.setup()
    const { openSettingsEvent } = createConsentConfig('test-app')
    const listener = vi.fn()
    window.addEventListener(openSettingsEvent, listener)

    renderWithProvider(<CookieSettingsButton appKey="test-app" />)
    await user.click(screen.getByRole('button', { name: 'Настройки cookie' }))

    expect(listener).toHaveBeenCalledTimes(1)

    window.removeEventListener(openSettingsEvent, listener)
  })

  it('не задевает событие другого appKey', async () => {
    const user = userEvent.setup()
    const { openSettingsEvent } = createConsentConfig('other-app')
    const listener = vi.fn()
    window.addEventListener(openSettingsEvent, listener)

    renderWithProvider(<CookieSettingsButton appKey="test-app" />)
    await user.click(screen.getByRole('button', { name: 'Настройки cookie' }))

    expect(listener).not.toHaveBeenCalled()

    window.removeEventListener(openSettingsEvent, listener)
  })
})
