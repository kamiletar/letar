import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { SharedPlayerControls, type SharedPlayerControlsProps } from './SharedPlayerControls'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

function baseProps(overrides: Partial<SharedPlayerControlsProps> = {}): SharedPlayerControlsProps {
  return {
    isPlaying: false,
    currentTime: 65,
    duration: 600,
    volume: 0.5,
    isMuted: false,
    isFullscreen: false,
    isVisible: true,
    onTogglePlay: vi.fn(),
    onSeek: vi.fn(),
    onVolumeChange: vi.fn(),
    onToggleMute: vi.fn(),
    onToggleFullscreen: vi.fn(),
    onSkipTime: vi.fn(),
    ...overrides,
  }
}

describe('SharedPlayerControls', () => {
  it('отображает иконку Play, когда isPlaying=false, и вызывает onTogglePlay при клике', async () => {
    const user = userEvent.setup()
    const onTogglePlay = vi.fn()

    renderWithProvider(<SharedPlayerControls {...baseProps({ isPlaying: false, onTogglePlay })} />)

    const playButton = screen.getByRole('button', { name: 'Play' })
    await user.click(playButton)

    expect(onTogglePlay).toHaveBeenCalledTimes(1)
  })

  it('отображает иконку Pause, когда isPlaying=true', () => {
    renderWithProvider(<SharedPlayerControls {...baseProps({ isPlaying: true })} />)

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
  })

  it('отображает форматированное текущее время и длительность', () => {
    renderWithProvider(<SharedPlayerControls {...baseProps({ currentTime: 65, duration: 600 })} />)

    expect(screen.getByText('1:05 / 10:00')).toBeInTheDocument()
  })

  it('вызывает onSkipTime(-SKIP_TIME) при клике на "Skip back"', async () => {
    const user = userEvent.setup()
    const onSkipTime = vi.fn()

    renderWithProvider(<SharedPlayerControls {...baseProps({ onSkipTime })} />)

    await user.click(screen.getByRole('button', { name: 'Skip back' }))

    expect(onSkipTime).toHaveBeenCalledWith(-10)
  })

  it('вызывает onSkipTime(SKIP_TIME) при клике на "Skip forward"', async () => {
    const user = userEvent.setup()
    const onSkipTime = vi.fn()

    renderWithProvider(<SharedPlayerControls {...baseProps({ onSkipTime })} />)

    await user.click(screen.getByRole('button', { name: 'Skip forward' }))

    expect(onSkipTime).toHaveBeenCalledWith(10)
  })

  it('вызывает onToggleFullscreen при клике на кнопку fullscreen', async () => {
    const user = userEvent.setup()
    const onToggleFullscreen = vi.fn()

    renderWithProvider(<SharedPlayerControls {...baseProps({ isFullscreen: false, onToggleFullscreen })} />)

    await user.click(screen.getByRole('button', { name: 'Enter fullscreen' }))

    expect(onToggleFullscreen).toHaveBeenCalledTimes(1)
  })

  it('показывает "Exit fullscreen", когда isFullscreen=true', () => {
    renderWithProvider(<SharedPlayerControls {...baseProps({ isFullscreen: true })} />)

    expect(screen.getByRole('button', { name: 'Exit fullscreen' })).toBeInTheDocument()
  })

  it('не рендерит SpeedSelector, если onPlaybackSpeedChange не передан', () => {
    renderWithProvider(<SharedPlayerControls {...baseProps({ onPlaybackSpeedChange: undefined })} />)

    expect(screen.queryByLabelText('Скорость воспроизведения')).not.toBeInTheDocument()
  })

  it('рендерит SpeedSelector, если onPlaybackSpeedChange передан', () => {
    renderWithProvider(
      <SharedPlayerControls {...baseProps({ onPlaybackSpeedChange: vi.fn(), playbackSpeed: 1.5 })} />,
    )

    expect(screen.getByLabelText('Скорость воспроизведения')).toBeInTheDocument()
    expect(screen.getByText('1.5x')).toBeInTheDocument()
  })

  it('рендерит переданные слоты navigationSlot/trackSelectorSlot/extraControlsSlot', () => {
    renderWithProvider(
      <SharedPlayerControls
        {...baseProps({
          navigationSlot: <div>NAV_SLOT</div>,
          trackSelectorSlot: <div>TRACK_SLOT</div>,
          extraControlsSlot: <div>EXTRA_SLOT</div>,
        })}
      />,
    )

    expect(screen.getByText('NAV_SLOT')).toBeInTheDocument()
    expect(screen.getByText('TRACK_SLOT')).toBeInTheDocument()
    expect(screen.getByText('EXTRA_SLOT')).toBeInTheDocument()
  })

  it('делает панель невидимой (opacity 0, pointer-events none) при isVisible=false', () => {
    const { container } = renderWithProvider(<SharedPlayerControls {...baseProps({ isVisible: false })} />)

    const panel = container.firstElementChild as HTMLElement
    expect(getComputedStyle(panel).opacity).toBe('0')
    expect(getComputedStyle(panel).pointerEvents).toBe('none')
  })

  it('делает панель видимой (opacity 1, pointer-events auto) при isVisible=true', () => {
    const { container } = renderWithProvider(<SharedPlayerControls {...baseProps({ isVisible: true })} />)

    const panel = container.firstElementChild as HTMLElement
    expect(getComputedStyle(panel).opacity).toBe('1')
    expect(getComputedStyle(panel).pointerEvents).toBe('auto')
  })
})
