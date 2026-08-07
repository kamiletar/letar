import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { Chapter } from '@letar/video-player-core'

import { ChapterList } from './ChapterList'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

const chapters: Chapter[] = [
  { id: '1', title: 'Опенинг', startTime: 0, endTime: 90, type: 'OP' },
  { id: '2', title: 'Первая сцена', startTime: 90, endTime: 600 },
  { id: '3', title: 'Эндинг', startTime: 600, endTime: 660, type: 'ED' },
]

describe('ChapterList', () => {
  it('показывает "Нет глав", когда список пуст', () => {
    renderWithProvider(<ChapterList chapters={[]} currentTime={0} duration={660} />)

    expect(screen.getByText('Нет глав')).toBeInTheDocument()
  })

  it('рендерит все главы с названиями и временем', () => {
    renderWithProvider(<ChapterList chapters={chapters} currentTime={0} duration={660} />)

    expect(screen.getByText('Опенинг')).toBeInTheDocument()
    expect(screen.getByText('Первая сцена')).toBeInTheDocument()
    expect(screen.getByText('Эндинг')).toBeInTheDocument()
  })

  it('рендерит бейджи типов глав только для глав с type', () => {
    renderWithProvider(<ChapterList chapters={chapters} currentTime={0} duration={660} />)

    expect(screen.getByText('OP')).toBeInTheDocument()
    expect(screen.getByText('ED')).toBeInTheDocument()
  })

  it('вызывает onSeek с startTime главы при клике', async () => {
    const user = userEvent.setup()
    const onSeek = vi.fn()

    renderWithProvider(<ChapterList chapters={chapters} currentTime={0} duration={660} onSeek={onSeek} />)

    await user.click(screen.getByText('Первая сцена'))

    expect(onSeek).toHaveBeenCalledWith(90)
  })

  it('подсвечивает главу, соответствующую currentTime (последнюю с startTime <= currentTime), отдельным набором классов от неактивной', () => {
    renderWithProvider(<ChapterList chapters={chapters} currentTime={100} duration={660} />)

    // активная — "Первая сцена" (startTime 90 <= 100 < 600); bg/borderColor завязаны на isActive,
    // поэтому у активной и неактивной строки должен получиться разный набор атомарных CSS-классов.
    // getComputedStyle тут не годится — jsdom не парсит динамически внедрённые emotion-стили,
    // backgroundColor у обеих строк вычисляется как одинаковый 'rgba(0, 0, 0, 0)'.
    const activeRow = screen.getByText('Первая сцена').closest('button') as HTMLElement
    const inactiveRow = screen.getByText('Опенинг').closest('button') as HTMLElement

    expect(activeRow.className).not.toBe(inactiveRow.className)
  })

  it('не падает при клике, если onSeek не передан', async () => {
    const user = userEvent.setup()

    renderWithProvider(<ChapterList chapters={chapters} currentTime={0} duration={660} />)

    await expect(user.click(screen.getByText('Опенинг'))).resolves.not.toThrow()
  })
})
