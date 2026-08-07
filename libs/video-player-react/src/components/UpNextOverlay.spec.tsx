import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { type UpNextContent, UpNextOverlay } from './UpNextOverlay'

function renderWithChakra(ui: React.ReactElement) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

const episodeContent: UpNextContent = {
  type: 'episode',
  title: 'Серия 5',
  subtitle: '5',
}

describe('UpNextOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('не рендерит ничего когда isVisible=false', () => {
    const { container } = renderWithChakra(
      <UpNextOverlay next={episodeContent} isVisible={false} onPlayNow={vi.fn()} onCancel={vi.fn()} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('не рендерит ничего когда next=null', () => {
    const { container } = renderWithChakra(
      <UpNextOverlay next={null} isVisible={true} onPlayNow={vi.fn()} onCancel={vi.fn()} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('показывает заголовок и стартовое значение countdown при видимости', () => {
    renderWithChakra(
      <UpNextOverlay
        next={episodeContent}
        isVisible={true}
        countdownSeconds={5}
        onPlayNow={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByText('Серия 5')).toBeInTheDocument()
    expect(screen.getByText('5с')).toBeInTheDocument()
  })

  it('countdown уменьшается на 1 каждую секунду', () => {
    renderWithChakra(
      <UpNextOverlay
        next={episodeContent}
        isVisible={true}
        countdownSeconds={5}
        onPlayNow={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText('4с')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.getByText('2с')).toBeInTheDocument()
  })

  it('вызывает onPlayNow автоматически когда countdown доходит до нуля', () => {
    const onPlayNow = vi.fn()
    renderWithChakra(
      <UpNextOverlay
        next={episodeContent}
        isVisible={true}
        countdownSeconds={2}
        onPlayNow={onPlayNow}
        onCancel={vi.fn()}
      />,
    )

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(onPlayNow).toHaveBeenCalledTimes(1)
  })

  it('не запускает автопереход когда autoPlayEnabled=false', () => {
    const onPlayNow = vi.fn()
    renderWithChakra(
      <UpNextOverlay
        next={episodeContent}
        isVisible={true}
        autoPlayEnabled={false}
        countdownSeconds={2}
        onPlayNow={onPlayNow}
        onCancel={vi.fn()}
      />,
    )

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(onPlayNow).not.toHaveBeenCalled()
    expect(screen.queryByText('2с')).not.toBeInTheDocument()
  })

  it('вызывает onCancel при клике на кнопку закрытия', () => {
    const onCancel = vi.fn()
    renderWithChakra(
      <UpNextOverlay next={episodeContent} isVisible={true} onPlayNow={vi.fn()} onCancel={onCancel} />,
    )

    // Кнопка закрытия — единственная кнопка без текста рядом с крестиком (иконка LuX)
    const buttons = screen.getAllByRole('button')
    const closeButton = buttons.find((b) => b.textContent === '')
    expect(closeButton).toBeDefined()
    fireEvent.click(closeButton!)

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('вызывает onPlayNow при клике на кнопку "Смотреть"', () => {
    const onPlayNow = vi.fn()
    renderWithChakra(
      <UpNextOverlay next={episodeContent} isVisible={true} onPlayNow={onPlayNow} onCancel={vi.fn()} />,
    )

    fireEvent.click(screen.getByText('Смотреть'))

    expect(onPlayNow).toHaveBeenCalledTimes(1)
  })

  it('использует тему сиквела для type="anime"', () => {
    const animeContent: UpNextContent = { type: 'anime', title: 'Сезон 2', subtitle: 'Продолжение' }
    renderWithChakra(
      <UpNextOverlay next={animeContent} isVisible={true} onPlayNow={vi.fn()} onCancel={vi.fn()} />,
    )

    expect(screen.getByText('Сиквел')).toBeInTheDocument()
    expect(screen.getByText('Смотреть сиквел')).toBeInTheDocument()
  })
})
