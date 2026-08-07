import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { PasswordInput, PasswordStrengthMeter } from './password-input'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('PasswordInput', () => {
  it('по умолчанию тип input — password', () => {
    renderWithProvider(<PasswordInput placeholder="Пароль" />)

    expect(screen.getByPlaceholderText('Пароль')).toHaveAttribute('type', 'password')
  })

  it('клик по кнопке переключает видимость на text', async () => {
    const user = userEvent.setup()
    renderWithProvider(<PasswordInput placeholder="Пароль" />)

    const input = screen.getByPlaceholderText('Пароль')
    const toggle = screen.getByRole('button', { name: 'Показать/скрыть пароль' })

    await user.click(toggle)

    expect(input).toHaveAttribute('type', 'text')
  })

  it('повторный клик возвращает тип к password', async () => {
    const user = userEvent.setup()
    renderWithProvider(<PasswordInput placeholder="Пароль" />)

    const input = screen.getByPlaceholderText('Пароль')
    const toggle = screen.getByRole('button', { name: 'Показать/скрыть пароль' })

    await user.click(toggle)
    expect(input).toHaveAttribute('type', 'text')

    await user.click(toggle)
    expect(input).toHaveAttribute('type', 'password')
  })

  it('defaultVisible=true — сразу показывает пароль текстом', () => {
    renderWithProvider(<PasswordInput placeholder="Пароль" defaultVisible />)

    expect(screen.getByPlaceholderText('Пароль')).toHaveAttribute('type', 'text')
  })

  it('контролируемый visible — управляется извне', async () => {
    const onVisibleChange = vi.fn()
    const user = userEvent.setup()

    renderWithProvider(<PasswordInput placeholder="Пароль" visible={false} onVisibleChange={onVisibleChange} />)

    const toggle = screen.getByRole('button', { name: 'Показать/скрыть пароль' })
    await user.click(toggle)

    expect(onVisibleChange).toHaveBeenCalledWith(true)
    // остаётся password, т.к. родитель не обновил visible-проп
    expect(screen.getByPlaceholderText('Пароль')).toHaveAttribute('type', 'password')
  })

  it('disabled — кнопка переключения недоступна', () => {
    renderWithProvider(<PasswordInput placeholder="Пароль" disabled />)

    expect(screen.getByRole('button', { name: 'Показать/скрыть пароль' })).toBeDisabled()
  })
})

describe('PasswordStrengthMeter', () => {
  it('показывает лейбл «Простой» при низком значении', () => {
    renderWithProvider(<PasswordStrengthMeter value={0} max={4} />)

    expect(screen.getByText('Простой')).toBeInTheDocument()
  })

  it('показывает лейбл «Хороший» при среднем значении', () => {
    renderWithProvider(<PasswordStrengthMeter value={2} max={4} />)

    expect(screen.getByText('Хороший')).toBeInTheDocument()
  })

  it('показывает лейбл «Надёжный» при максимальном значении', () => {
    renderWithProvider(<PasswordStrengthMeter value={4} max={4} />)

    expect(screen.getByText('Надёжный')).toBeInTheDocument()
  })
})
