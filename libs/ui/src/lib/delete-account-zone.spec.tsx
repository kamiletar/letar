import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DeleteAccountZone } from './delete-account-zone'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('DeleteAccountZone', () => {
  const originalLocation = window.location

  beforeEach(() => {
    // @ts-expect-error — подменяем window.location, чтобы перехватить редирект в jsdom
    delete window.location
    // @ts-expect-error — упрощённый мок, достаточный для проверки href
    window.location = { href: '' }
  })

  afterEach(() => {
    window.location = originalLocation
    vi.restoreAllMocks()
  })

  it('рендерит секцию с кнопкой удаления аккаунта', () => {
    renderWithProvider(<DeleteAccountZone onDelete={vi.fn()} />)
    expect(screen.getByText('Удаление аккаунта')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Удалить аккаунт' })).toBeInTheDocument()
  })

  it('открывает диалог подтверждения по клику', async () => {
    const user = userEvent.setup()
    renderWithProvider(<DeleteAccountZone onDelete={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Удалить аккаунт' }))
    expect(await screen.findByText('Удалить аккаунт?')).toBeInTheDocument()
  })

  it('при успешном удалении редиректит на redirectUrl по умолчанию', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn().mockResolvedValue({ ok: true })
    renderWithProvider(<DeleteAccountZone onDelete={onDelete} />)

    await user.click(screen.getByRole('button', { name: 'Удалить аккаунт' }))
    const confirmButton = await screen.findByRole('button', { name: 'Удалить навсегда' })
    await user.click(confirmButton)

    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(window.location.href).toBe('/sign-in')
  })

  it('редиректит на кастомный redirectUrl', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn().mockResolvedValue({ ok: true })
    renderWithProvider(<DeleteAccountZone onDelete={onDelete} redirectUrl="/goodbye" />)

    await user.click(screen.getByRole('button', { name: 'Удалить аккаунт' }))
    const confirmButton = await screen.findByRole('button', { name: 'Удалить навсегда' })
    await user.click(confirmButton)

    expect(window.location.href).toBe('/goodbye')
  })

  it('показывает сообщение об ошибке при неуспешном удалении и не редиректит', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn().mockResolvedValue({ ok: false, error: 'Нельзя удалить активную подписку' })
    renderWithProvider(<DeleteAccountZone onDelete={onDelete} />)

    await user.click(screen.getByRole('button', { name: 'Удалить аккаунт' }))
    const confirmButton = await screen.findByRole('button', { name: 'Удалить навсегда' })
    await user.click(confirmButton)

    expect(await screen.findByText('Нельзя удалить активную подписку')).toBeInTheDocument()
    expect(window.location.href).toBe('')
  })

  it('показывает дефолтное сообщение об ошибке, если error не передан', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn().mockResolvedValue({ ok: false })
    renderWithProvider(<DeleteAccountZone onDelete={onDelete} />)

    await user.click(screen.getByRole('button', { name: 'Удалить аккаунт' }))
    const confirmButton = await screen.findByRole('button', { name: 'Удалить навсегда' })
    await user.click(confirmButton)

    expect(await screen.findByText('Ошибка удаления аккаунта')).toBeInTheDocument()
  })
})
