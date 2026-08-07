import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { PlaybackSpeed } from '../types'
import { SpeedSelector } from './SpeedSelector'

function renderWithChakra(ui: React.ReactElement) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('SpeedSelector', () => {
  it('не показывает текстовую метку скорости когда speed === 1', () => {
    renderWithChakra(<SpeedSelector speed={1} onSpeedChange={vi.fn()} />)

    expect(screen.queryByText('1x')).not.toBeInTheDocument()
  })

  it('показывает текстовую метку текущей скорости когда она отличается от 1', () => {
    renderWithChakra(<SpeedSelector speed={1.5} onSpeedChange={vi.fn()} />)

    expect(screen.getByText('1.5x')).toBeInTheDocument()
  })

  it('меню скоростей скрыто по умолчанию', () => {
    renderWithChakra(<SpeedSelector speed={1} onSpeedChange={vi.fn()} />)

    expect(screen.queryByText('Обычная')).not.toBeInTheDocument()
  })

  it('открывает список скоростей при клике на кнопку', () => {
    renderWithChakra(<SpeedSelector speed={1} onSpeedChange={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Скорость воспроизведения' }))

    expect(screen.getByText('Обычная')).toBeInTheDocument()
    expect(screen.getByText('2x')).toBeInTheDocument()
  })

  it('вызывает onSpeedChange с выбранной скоростью и закрывает меню', () => {
    const onSpeedChange = vi.fn()
    renderWithChakra(<SpeedSelector speed={1} onSpeedChange={onSpeedChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Скорость воспроизведения' }))
    fireEvent.click(screen.getByText('2x'))

    expect(onSpeedChange).toHaveBeenCalledWith(2 satisfies PlaybackSpeed)
    expect(screen.queryByText('Обычная')).not.toBeInTheDocument()
  })
})
