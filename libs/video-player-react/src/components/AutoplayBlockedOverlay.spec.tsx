import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { AutoplayBlockedOverlay } from './AutoplayBlockedOverlay'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('AutoplayBlockedOverlay', () => {
  it('ничего не рендерит, если ни аудио, ни видео не заблокированы', () => {
    const { container } = renderWithProvider(
      <AutoplayBlockedOverlay
        isAudioBlocked={false}
        isVideoBlocked={false}
        onUnblockAudio={vi.fn()}
        onUnblockAll={vi.fn()}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('показывает чип "Нажмите для звука", когда заблокировано только аудио', () => {
    renderWithProvider(
      <AutoplayBlockedOverlay
        isAudioBlocked={true}
        isVideoBlocked={false}
        onUnblockAudio={vi.fn()}
        onUnblockAll={vi.fn()}
      />,
    )

    expect(screen.getByText('Нажмите для звука')).toBeInTheDocument()
  })

  it('показывает большую кнопку play, когда заблокировано видео (приоритет над аудио)', () => {
    renderWithProvider(
      <AutoplayBlockedOverlay
        isAudioBlocked={true}
        isVideoBlocked={true}
        onUnblockAudio={vi.fn()}
        onUnblockAll={vi.fn()}
      />,
    )

    // чип аудио не должен отображаться, когда видео тоже заблокировано
    expect(screen.queryByText('Нажмите для звука')).not.toBeInTheDocument()
  })

  it('вызывает onUnblockAudio при клике на чип', async () => {
    const user = userEvent.setup()
    const onUnblockAudio = vi.fn()

    renderWithProvider(
      <AutoplayBlockedOverlay
        isAudioBlocked={true}
        isVideoBlocked={false}
        onUnblockAudio={onUnblockAudio}
        onUnblockAll={vi.fn()}
      />,
    )

    await user.click(screen.getByText('Нажмите для звука'))

    expect(onUnblockAudio).toHaveBeenCalledTimes(1)
  })

  it('вызывает onUnblockAll при клике на оверлей блокировки видео', async () => {
    const user = userEvent.setup()
    const onUnblockAll = vi.fn()

    const { container } = renderWithProvider(
      <AutoplayBlockedOverlay
        isAudioBlocked={false}
        isVideoBlocked={true}
        onUnblockAudio={vi.fn()}
        onUnblockAll={onUnblockAll}
      />,
    )

    // кликабельный оверлей — единственный верхнеуровневый элемент
    const overlay = container.firstElementChild as HTMLElement
    await user.click(overlay)

    expect(onUnblockAll).toHaveBeenCalledTimes(1)
  })
})
