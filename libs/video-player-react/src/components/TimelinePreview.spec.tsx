import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { SpriteCue } from '../utils/sprite-vtt'
import { TimelinePreview } from './TimelinePreview'

function renderWithChakra(ui: React.ReactElement) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

const cues: SpriteCue[] = [
  { startTime: 0, endTime: 10, x: 0, y: 0, width: 160, height: 90 },
  { startTime: 10, endTime: 20, x: 160, y: 0, width: 160, height: 90 },
]

describe('TimelinePreview', () => {
  it('ничего не рендерит когда для времени наведения нет cue', () => {
    const { container } = renderWithChakra(
      <TimelinePreview spriteUrl="/sprite.jpg" cues={cues} hoverTime={999} cursorX={50} containerWidth={400} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('рендерит превью и время когда есть подходящий cue', () => {
    renderWithChakra(
      <TimelinePreview spriteUrl="/sprite.jpg" cues={cues} hoverTime={5} cursorX={50} containerWidth={400} />,
    )

    expect(screen.getByText('0:05')).toBeInTheDocument()
  })

  it('использует координаты второго cue для второго диапазона времени', () => {
    renderWithChakra(
      <TimelinePreview spriteUrl="/sprite.jpg" cues={cues} hoverTime={15} cursorX={50} containerWidth={400} />,
    )

    expect(screen.getByText('0:15')).toBeInTheDocument()
  })

  it('не выходит за левую границу контейнера при курсоре у левого края', () => {
    const { container } = renderWithChakra(
      <TimelinePreview spriteUrl="/sprite.jpg" cues={cues} hoverTime={5} cursorX={0} containerWidth={400} />,
    )

    const previewBox = container.firstChild as HTMLElement
    expect(getComputedStyle(previewBox).left).toBe('0px')
  })

  it('не выходит за правую границу контейнера при курсоре у правого края', () => {
    const { container } = renderWithChakra(
      <TimelinePreview spriteUrl="/sprite.jpg" cues={cues} hoverTime={5} cursorX={395} containerWidth={400} />,
    )

    const previewBox = container.firstChild as HTMLElement
    // containerWidth(400) - PREVIEW_WIDTH(160) = 240
    expect(getComputedStyle(previewBox).left).toBe('240px')
  })
})
