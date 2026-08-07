import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Pressable, pressableConfig } from './pressable'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('Pressable', () => {
  it('рендерит children', () => {
    const { getByText } = renderWithProvider(
      <Pressable>
        <span>контент</span>
      </Pressable>,
    )
    expect(getByText('контент')).toBeInTheDocument()
  })

  it('добавляет data-pressable атрибут на контейнер', () => {
    const { container } = renderWithProvider(<Pressable>content</Pressable>)
    expect(container.querySelector('[data-pressable]')).toBeInTheDocument()
  })

  it('создаёт ripple-элемент при pointerdown мышью', () => {
    const { container } = renderWithProvider(<Pressable>content</Pressable>)
    const root = container.querySelector('[data-pressable]') as HTMLElement
    expect(root.childElementCount).toBe(0) // только текстовый узел children (не элемент)

    fireEvent.pointerDown(root, { pointerType: 'mouse', clientX: 10, clientY: 10 })

    expect(root.childElementCount).toBe(1) // + ripple-элемент
  })

  it('НЕ создаёт ripple-элемент при pointerdown тачем', () => {
    const { container } = renderWithProvider(<Pressable>content</Pressable>)
    const root = container.querySelector('[data-pressable]') as HTMLElement

    fireEvent.pointerDown(root, { pointerType: 'touch', clientX: 10, clientY: 10 })

    expect(root.childElementCount).toBe(0)
  })

  it('вызывает переданный внешний onPointerDown вместе с внутренним обработчиком', () => {
    const externalHandler = vi.fn()
    const { container } = renderWithProvider(<Pressable onPointerDown={externalHandler}>content</Pressable>)
    const root = container.querySelector('[data-pressable]') as HTMLElement

    fireEvent.pointerDown(root, { pointerType: 'mouse' })

    expect(externalHandler).toHaveBeenCalledTimes(1)
  })

  it('пробрасывает дополнительные BoxProps', () => {
    const { container } = renderWithProvider(<Pressable data-testid="my-pressable">content</Pressable>)
    expect(container.querySelector('[data-testid="my-pressable"]')).toBeInTheDocument()
  })
})

describe('pressableConfig', () => {
  it('содержит кейфрейм ripple-expand', () => {
    expect(pressableConfig.keyframes['ripple-expand']).toBeDefined()
    expect(pressableConfig.keyframes['ripple-expand'].from).toEqual({ transform: 'scale(0)', opacity: '1' })
    expect(pressableConfig.keyframes['ripple-expand'].to).toEqual({ transform: 'scale(1)', opacity: '0' })
  })

  it('содержит globalCss для [data-pressable]', () => {
    expect(pressableConfig.globalCss['[data-pressable]']).toBeDefined()
    expect(pressableConfig.globalCss['[data-pressable]'].touchAction).toBe('manipulation')
  })
})
