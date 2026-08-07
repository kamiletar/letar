import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ChapterInfo } from '@letar/video-player-core'
import type { SpriteCue } from '../utils/sprite-vtt'

import { SharedProgressBar } from './SharedProgressBar'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

const chapters: ChapterInfo[] = [
  { id: '1', title: 'Опенинг', startTime: 0 },
  { id: '2', title: 'Основная сцена', startTime: 300 },
]

const spriteCues: SpriteCue[] = [
  { startTime: 0, endTime: 300, x: 0, y: 0, width: 160, height: 90 },
  { startTime: 300, endTime: 600, x: 160, y: 0, width: 160, height: 90 },
]

describe('SharedProgressBar', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('вызывает onSeek([0]) при нажатии Home на слайдере (значение -> min)', async () => {
    const user = userEvent.setup()
    const onSeek = vi.fn()

    renderWithProvider(<SharedProgressBar progress={50} onSeek={onSeek} duration={600} />)

    // Slider.Thumb в этом компоненте визуально скрыт до наведения/фокуса (chakra recipe),
    // поэтому доступен только через hidden:true — сама доступность (role=slider,
    // клавиатурная навигация) при этом работает
    const thumb = screen.getByRole('slider', { hidden: true })
    thumb.focus()
    await user.keyboard('{Home}')

    expect(onSeek).toHaveBeenCalledWith([0])
  })

  it('вызывает onSeek([100]) при нажатии End на слайдере (значение -> max)', async () => {
    const user = userEvent.setup()
    const onSeek = vi.fn()

    renderWithProvider(<SharedProgressBar progress={50} onSeek={onSeek} duration={600} />)

    const thumb = screen.getByRole('slider', { hidden: true })
    thumb.focus()
    await user.keyboard('{End}')

    expect(onSeek).toHaveBeenCalledWith([100])
  })

  it('не рендерит маркеры глав, если chapters не переданы', () => {
    renderWithProvider(<SharedProgressBar progress={0} onSeek={vi.fn()} duration={600} />)

    expect(screen.queryByText('Опенинг')).not.toBeInTheDocument()
    expect(document.querySelectorAll('[data-part="trigger"][data-scope="tooltip"]').length).toBe(0)
  })

  it('рендерит маркеры глав на корректной позиции (% от duration)', () => {
    renderWithProvider(<SharedProgressBar progress={0} onSeek={vi.fn()} duration={600} chapters={chapters} />)

    // jsdom не умеет вычислять getComputedStyle для позиций, приходящих из динамически
    // внедрённых emotion-классов (см. соседние тесты ChapterList) — поэтому проверяем
    // литеральный текст сгенерированного CSS-правила в <head>: первый маркер (startTime=0)
    // должен получить left:0%, второй (startTime=300 из 600) — left:50%
    const headCss = document.head.innerHTML
    expect(headCss).toContain('left:0%')
    expect(headCss).toContain('left:50%')
  })

  it('вызывает onChapterSeek со startTime главы при клике на маркер', () => {
    const onChapterSeek = vi.fn()

    renderWithProvider(
      <SharedProgressBar
        progress={0}
        onSeek={vi.fn()}
        duration={600}
        chapters={chapters}
        onChapterSeek={onChapterSeek}
      />,
    )

    // маркеры — Tooltip-триггеры (Box с asChild), в порядке chapters
    const markers = Array.from(
      document.querySelectorAll('[data-part="trigger"][data-scope="tooltip"]'),
    ) as HTMLElement[]
    expect(markers).toHaveLength(2)

    // второй маркер соответствует главе "Основная сцена" (startTime=300)
    fireEvent.click(markers[1])

    expect(onChapterSeek).toHaveBeenCalledWith(300)
  })

  it('не показывает preview, если spriteUrl/spriteCues не переданы (даже при наведении)', () => {
    const { container } = renderWithProvider(<SharedProgressBar progress={0} onSeek={vi.fn()} duration={600} />)

    const trackContainer = container.firstElementChild as HTMLElement
    fireEvent.mouseEnter(trackContainer)
    fireEvent.mouseMove(trackContainer, { clientX: 50 })

    // TimelinePreview рендерит текст времени через formatTime — его быть не должно
    expect(screen.queryByText(/^\d{1,2}:\d{2}$/)).not.toBeInTheDocument()
  })

  it('показывает preview с корректным временем при наведении, когда есть spriteUrl/spriteCues', () => {
    const { container } = renderWithProvider(
      <SharedProgressBar
        progress={0}
        onSeek={vi.fn()}
        duration={600}
        spriteUrl="/sprite.jpg"
        spriteCues={spriteCues}
      />,
    )

    const trackContainer = container.firstElementChild as HTMLElement
    vi.spyOn(trackContainer, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      right: 300,
      bottom: 10,
      width: 300,
      height: 10,
      x: 0,
      y: 0,
      toJSON: () => {},
    } as DOMRect)

    fireEvent.mouseEnter(trackContainer)
    // x=150 из 300px ширины -> fraction 0.5 -> hoverTime = 0.5 * 600 = 300s -> formatTime = "5:00"
    fireEvent.mouseMove(trackContainer, { clientX: 150 })

    expect(screen.getByText('5:00')).toBeInTheDocument()
  })

  it('скрывает preview при mouseLeave', () => {
    const { container } = renderWithProvider(
      <SharedProgressBar
        progress={0}
        onSeek={vi.fn()}
        duration={600}
        spriteUrl="/sprite.jpg"
        spriteCues={spriteCues}
      />,
    )

    const trackContainer = container.firstElementChild as HTMLElement
    vi.spyOn(trackContainer, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      right: 300,
      bottom: 10,
      width: 300,
      height: 10,
      x: 0,
      y: 0,
      toJSON: () => {},
    } as DOMRect)

    fireEvent.mouseEnter(trackContainer)
    fireEvent.mouseMove(trackContainer, { clientX: 150 })
    expect(screen.getByText('5:00')).toBeInTheDocument()

    fireEvent.mouseLeave(trackContainer)
    expect(screen.queryByText('5:00')).not.toBeInTheDocument()
  })
})
