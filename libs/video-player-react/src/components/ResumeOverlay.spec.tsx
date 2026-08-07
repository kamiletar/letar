import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ResumeOverlay } from './ResumeOverlay'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('ResumeOverlay', () => {
  it('ничего не рендерит, когда isOpen=false', () => {
    const { container } = renderWithProvider(
      <ResumeOverlay savedTime={120} onResume={vi.fn()} onStartOver={vi.fn()} isOpen={false} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('ничего не рендерит, когда savedTime меньше порога (10 сек)', () => {
    const { container } = renderWithProvider(
      <ResumeOverlay savedTime={5} onResume={vi.fn()} onStartOver={vi.fn()} isOpen={true} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('рендерит текст с сохранённым временем, когда открыт и savedTime >= 10', () => {
    renderWithProvider(<ResumeOverlay savedTime={125} onResume={vi.fn()} onStartOver={vi.fn()} isOpen={true} />)

    expect(screen.getByText('Продолжить просмотр?')).toBeInTheDocument()
  })

  it('вызывает onResume при клике на кнопку "Продолжить"', async () => {
    const user = userEvent.setup()
    const onResume = vi.fn()

    renderWithProvider(<ResumeOverlay savedTime={120} onResume={onResume} onStartOver={vi.fn()} isOpen={true} />)

    await user.click(screen.getByRole('button', { name: /Продолжить/ }))

    expect(onResume).toHaveBeenCalledTimes(1)
  })

  it('вызывает onStartOver при клике на кнопку "Сначала"', async () => {
    const user = userEvent.setup()
    const onStartOver = vi.fn()

    renderWithProvider(
      <ResumeOverlay savedTime={120} onResume={vi.fn()} onStartOver={onStartOver} isOpen={true} />,
    )

    await user.click(screen.getByRole('button', { name: 'Сначала' }))

    expect(onStartOver).toHaveBeenCalledTimes(1)
  })

  describe('автоматический выбор "Продолжить"', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('автоматически вызывает onResume через 5 секунд обратного отсчёта', () => {
      const onResume = vi.fn()

      renderWithProvider(
        <ResumeOverlay savedTime={120} onResume={onResume} onStartOver={vi.fn()} isOpen={true} />,
      )

      expect(onResume).not.toHaveBeenCalled()

      act(() => {
        vi.advanceTimersByTime(5000)
      })

      expect(onResume).toHaveBeenCalledTimes(1)
    })

    it('не запускает автовыбор, если isOpen=false', () => {
      const onResume = vi.fn()

      renderWithProvider(
        <ResumeOverlay savedTime={120} onResume={onResume} onStartOver={vi.fn()} isOpen={false} />,
      )

      act(() => {
        vi.advanceTimersByTime(6000)
      })

      expect(onResume).not.toHaveBeenCalled()
    })
  })
})
