import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { PressableButton } from './pressable-button'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('PressableButton', () => {
  it('рендерит children', () => {
    renderWithProvider(<PressableButton>Сохранить</PressableButton>)

    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeInTheDocument()
  })

  it('вызывает onClick по клику', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()
    renderWithProvider(<PressableButton onClick={handleClick}>Кликни</PressableButton>)

    await user.click(screen.getByRole('button', { name: 'Кликни' }))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('disabled — кнопка недоступна для клика', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()
    renderWithProvider(
      <PressableButton disabled onClick={handleClick}>
        Недоступно
      </PressableButton>,
    )

    const button = screen.getByRole('button', { name: 'Недоступно' })
    expect(button).toBeDisabled()

    await user.click(button)
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('loading — кнопка недоступна для клика', () => {
    renderWithProvider(<PressableButton loading>Загрузка</PressableButton>)

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('data-pressable атрибут присутствует', () => {
    renderWithProvider(<PressableButton>Кнопка</PressableButton>)

    expect(screen.getByRole('button')).toHaveAttribute('data-pressable')
  })

  it('вызывает внешний onPointerDown вместе с ripple-логикой', () => {
    const handlePointerDown = vi.fn()
    renderWithProvider(<PressableButton onPointerDown={handlePointerDown}>Кнопка</PressableButton>)

    const button = screen.getByRole('button')
    button.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10, pointerType: 'mouse' }),
    )

    expect(handlePointerDown).toHaveBeenCalledTimes(1)
  })

  it('не вызывает onPointerDown, когда кнопка disabled', () => {
    const handlePointerDown = vi.fn()
    renderWithProvider(
      <PressableButton disabled onPointerDown={handlePointerDown}>
        Кнопка
      </PressableButton>,
    )

    const button = screen.getByRole('button')
    button.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10, pointerType: 'mouse' }),
    )

    expect(handlePointerDown).not.toHaveBeenCalled()
  })
})
