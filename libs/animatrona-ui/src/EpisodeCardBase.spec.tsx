import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { EpisodeCardBase } from './EpisodeCardBase'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('EpisodeCardBase', () => {
  it('рендерит номер эпизода', () => {
    renderWithProvider(<EpisodeCardBase number={5} />)

    expect(screen.getByText('Эпизод 5')).toBeInTheDocument()
  })

  it('рендерит отформатированную длительность, когда она положительна', () => {
    renderWithProvider(<EpisodeCardBase number={1} duration={25 * 60} />)

    expect(screen.getByText('25 мин')).toBeInTheDocument()
  })

  it('не рендерит длительность, когда она равна нулю', () => {
    renderWithProvider(<EpisodeCardBase number={1} duration={0} />)

    expect(screen.queryByText(/мин/)).not.toBeInTheDocument()
  })

  it('не рендерит длительность, когда она не задана', () => {
    renderWithProvider(<EpisodeCardBase number={1} />)

    expect(screen.queryByText(/мин|ч /)).not.toBeInTheDocument()
  })

  it('рендерит название эпизода, если оно передано', () => {
    renderWithProvider(<EpisodeCardBase number={1} name="Начало пути" />)

    expect(screen.getByText('Начало пути')).toBeInTheDocument()
  })

  it('не рендерит блок названия, если name не передан', () => {
    const { container } = renderWithProvider(<EpisodeCardBase number={1} />)

    // Единственный текстовый параграф — подпись номера эпизода, Card.Body с названием отсутствует
    expect(container.querySelectorAll('p')).toHaveLength(1)
  })

  it('показывает иконку play-заглушку, когда thumbnailSlot не передан', () => {
    const { container } = renderWithProvider(<EpisodeCardBase number={1} />)

    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('рендерит переданный thumbnailSlot вместо заглушки', () => {
    renderWithProvider(
      <EpisodeCardBase number={1} thumbnailSlot={<img src="/thumb.jpg" alt="Превью эпизода" />} />,
    )

    expect(screen.getByAltText('Превью эпизода')).toBeInTheDocument()
  })

  it('рендерит overlaySlot и actionsSlot', () => {
    renderWithProvider(
      <EpisodeCardBase
        number={1}
        overlaySlot={<span>Заблокировано</span>}
        actionsSlot={<button type="button">Смотреть</button>}
      />,
    )

    expect(screen.getByText('Заблокировано')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Смотреть' })).toBeInTheDocument()
  })

  it('вызывает onClick при клике на карточку', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    renderWithProvider(<EpisodeCardBase number={3} name="Клик" onClick={onClick} />)

    await user.click(screen.getByText('Клик'))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('оборачивает контент через переданный wrapper', () => {
    renderWithProvider(
      <EpisodeCardBase
        number={1}
        name="В обёртке"
        wrapper={(children) => <a href="/episode/1" data-testid="episode-link">{children}</a>}
      />,
    )

    const link = screen.getByTestId('episode-link')
    expect(link).toHaveAttribute('href', '/episode/1')
    expect(link).toContainElement(screen.getByText('В обёртке'))
  })

  it('не рендерит полоску прогресса, когда watchProgress = 0', () => {
    const { container } = renderWithProvider(<EpisodeCardBase number={1} watchProgress={0} />)

    // Chakra рендерит ширину через emotion-класс (w={`${watchProgress}%`}), а не инлайн-style
    // или видимый текст — искать нужно через getComputedStyle, а не строковый поиск по HTML.
    const hasProgressFill = Array.from(container.querySelectorAll('div')).some((el) =>
      /^\d+%$/.test(getComputedStyle(el).width)
    )
    expect(hasProgressFill).toBe(false)
  })

  it('рендерит полоску прогресса шириной watchProgress%, когда он положителен', () => {
    const { container } = renderWithProvider(<EpisodeCardBase number={1} watchProgress={42} />)

    const progressFill = Array.from(container.querySelectorAll('div')).find(
      (el) => getComputedStyle(el).width === '42%',
    )
    expect(progressFill).toBeTruthy()
  })
})
