import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { QuantityStepper } from './quantity-stepper'

import type { ReactNode } from 'react'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('QuantityStepper', () => {
  it('отображает текущее значение', () => {
    renderWithProvider(<QuantityStepper value={5} onChange={vi.fn()} />)
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('вызывает onChange с увеличенным значением при клике на плюс', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithProvider(<QuantityStepper value={3} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /Увеличить/ }))

    expect(onChange).toHaveBeenCalledWith(4)
  })

  it('вызывает onChange с уменьшенным значением при клике на минус', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithProvider(<QuantityStepper value={3} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /Уменьшить/ }))

    expect(onChange).toHaveBeenCalledWith(2)
  })

  it('блокирует кнопку минус на нижней границе min', () => {
    renderWithProvider(<QuantityStepper value={1} min={1} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Уменьшить/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Увеличить/ })).not.toBeDisabled()
  })

  it('блокирует кнопку плюс на верхней границе max', () => {
    renderWithProvider(<QuantityStepper value={99} max={99} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Увеличить/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Уменьшить/ })).not.toBeDisabled()
  })

  it('использует кастомные min/max для границ', () => {
    renderWithProvider(<QuantityStepper value={2} min={2} max={10} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Уменьшить/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Увеличить/ })).not.toBeDisabled()
  })

  it('блокирует обе кнопки при disabled=true', () => {
    renderWithProvider(<QuantityStepper value={5} disabled onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Уменьшить/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Увеличить/ })).toBeDisabled()
  })

  it('не вызывает onChange при клике на заблокированную кнопку', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithProvider(<QuantityStepper value={1} min={1} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /Уменьшить/ }))

    expect(onChange).not.toHaveBeenCalled()
  })

  it('использует кастомный ariaLabel', () => {
    renderWithProvider(<QuantityStepper value={1} onChange={vi.fn()} ariaLabel="Количество билетов" />)
    expect(screen.getByRole('button', { name: 'Уменьшить: Количество билетов' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Увеличить: Количество билетов' })).toBeInTheDocument()
  })
})
