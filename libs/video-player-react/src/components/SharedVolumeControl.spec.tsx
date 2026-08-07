import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SharedVolumeControl } from './SharedVolumeControl'

function renderWithChakra(ui: React.ReactElement) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('SharedVolumeControl', () => {
  it('рендерит кнопку Mute когда звук включён', () => {
    renderWithChakra(
      <SharedVolumeControl volume={0.5} isMuted={false} onVolumeChange={vi.fn()} onToggleMute={vi.fn()} />,
    )

    expect(screen.getByRole('button', { name: 'Mute' })).toBeInTheDocument()
  })

  it('рендерит кнопку Unmute когда звук выключен', () => {
    renderWithChakra(
      <SharedVolumeControl volume={0.5} isMuted={true} onVolumeChange={vi.fn()} onToggleMute={vi.fn()} />,
    )

    expect(screen.getByRole('button', { name: 'Unmute' })).toBeInTheDocument()
  })

  it('вызывает onToggleMute при клике на кнопку', () => {
    const onToggleMute = vi.fn()
    renderWithChakra(
      <SharedVolumeControl volume={0.5} isMuted={false} onVolumeChange={vi.fn()} onToggleMute={onToggleMute} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Mute' }))

    expect(onToggleMute).toHaveBeenCalledTimes(1)
  })

  it('слайдер отражает текущую громкость в процентах (0-100)', () => {
    const { container } = renderWithChakra(
      <SharedVolumeControl volume={0.5} isMuted={false} onVolumeChange={vi.fn()} onToggleMute={vi.fn()} />,
    )

    // getByRole фильтрует по видимости, а Chakra-слайдер в jsdom иногда рендерит thumb
    // со style="visibility: hidden" до применения CSS-in-JS — используем querySelector напрямую
    const slider = container.querySelector('[role="slider"]')
    expect(slider).toHaveAttribute('aria-valuenow', '50')
  })

  it('слайдер показывает 0 когда звук выключен, даже при ненулевой громкости', () => {
    const { container } = renderWithChakra(
      <SharedVolumeControl volume={0.8} isMuted={true} onVolumeChange={vi.fn()} onToggleMute={vi.fn()} />,
    )

    const slider = container.querySelector('[role="slider"]')
    expect(slider).toHaveAttribute('aria-valuenow', '0')
  })

  it('вызывает onVolumeChange при нажатии End на слайдере (устанавливает максимум)', async () => {
    // ArrowRight/ArrowLeft у Zag.js-слайдера считают шаг через getBoundingClientRect() трека,
    // который в jsdom всегда нулевой — такое взаимодействие ненадёжно тестировать напрямую.
    // Home/End не зависят от геометрии — они детерминированно ставят min/max.
    // userEvent (не fireEvent) — сам оборачивает события в act() и ждёт асинхронные
    // обновления состояния Zag.js-стора слайдера, fireEvent.keyDown этого не делает.
    const user = userEvent.setup()
    const onVolumeChange = vi.fn()
    const { container } = renderWithChakra(
      <SharedVolumeControl volume={0.5} isMuted={false} onVolumeChange={onVolumeChange} onToggleMute={vi.fn()} />,
    )

    const slider = container.querySelector('[role="slider"]') as HTMLElement
    await user.click(slider)
    await user.keyboard('{End}')

    expect(onVolumeChange).toHaveBeenCalled()
    const callArg = onVolumeChange.mock.calls[0][0]
    expect(Array.isArray(callArg)).toBe(true)
    expect(callArg[0]).toBe(100)
  })
})
