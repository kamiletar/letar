import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { Chapter } from '@letar/video-player-core'

import { ChapterSkipButton } from './ChapterSkipButton'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

const chapters: Chapter[] = [
  { id: '1', title: 'Опенинг', startTime: 0, endTime: 90, type: 'OP' },
  { id: '2', title: 'Основная сцена', startTime: 90, endTime: 600 },
  { id: '3', title: 'Эндинг', startTime: 600, endTime: 660, type: 'ED' },
]

describe('ChapterSkipButton', () => {
  it('не рендерит кнопку, если список глав пуст', () => {
    const { container } = renderWithProvider(
      <ChapterSkipButton chapters={[]} currentTime={10} onSeek={vi.fn()} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('не рендерит кнопку вне диапазона пропускаемой главы', () => {
    const { container } = renderWithProvider(
      <ChapterSkipButton chapters={chapters} currentTime={200} onSeek={vi.fn()} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('не рендерит кнопку для непропускаемого типа главы (без type)', () => {
    const { container } = renderWithProvider(
      <ChapterSkipButton chapters={chapters} currentTime={100} onSeek={vi.fn()} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('рендерит кнопку пропуска внутри диапазона OP-главы', () => {
    renderWithProvider(<ChapterSkipButton chapters={chapters} currentTime={10} onSeek={vi.fn()} />)

    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('не рендерит кнопку в последние 3 секунды главы', () => {
    // endTime OP = 90, currentTime=88 -> 88 < 90 - 3 = 87 является ложным, значит скрыта
    const { container } = renderWithProvider(
      <ChapterSkipButton chapters={chapters} currentTime={88} onSeek={vi.fn()} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('вызывает onSeek с endTime текущей пропускаемой главы при клике', async () => {
    const user = userEvent.setup()
    const onSeek = vi.fn()

    renderWithProvider(<ChapterSkipButton chapters={chapters} currentTime={10} onSeek={onSeek} />)

    await user.click(screen.getByRole('button'))

    expect(onSeek).toHaveBeenCalledWith(90)
  })

  it('переключается на кнопку пропуска ED-главы, когда currentTime попадает в её диапазон', () => {
    renderWithProvider(<ChapterSkipButton chapters={chapters} currentTime={610} onSeek={vi.fn()} />)

    expect(screen.getByText('Пропустить эндинг')).toBeInTheDocument()
  })

  it('не падает при клике, если onSeek не передан', async () => {
    const user = userEvent.setup()

    renderWithProvider(<ChapterSkipButton chapters={chapters} currentTime={10} />)

    await expect(user.click(screen.getByRole('button'))).resolves.not.toThrow()
  })
})
