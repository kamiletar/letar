import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import { AnimeHeroBase } from './AnimeHeroBase'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('AnimeHeroBase', () => {
  it('рендерит название', () => {
    renderWithProvider(<AnimeHeroBase name="Атака титанов" />)

    expect(screen.getByRole('heading', { name: 'Атака титанов' })).toBeInTheDocument()
  })

  it('рендерит оригинальное название, когда оно задано', () => {
    renderWithProvider(<AnimeHeroBase name="Атака титанов" originalName="Shingeki no Kyojin" />)

    expect(screen.getByText('Shingeki no Kyojin')).toBeInTheDocument()
  })

  it('не рендерит оригинальное название, когда оно не задано', () => {
    renderWithProvider(<AnimeHeroBase name="Атака титанов" />)

    expect(screen.queryByText('Shingeki no Kyojin')).not.toBeInTheDocument()
  })

  it('рендерит постер с alt=name, когда posterUrl задан', () => {
    renderWithProvider(<AnimeHeroBase name="Атака титанов" posterUrl="/poster.jpg" />)

    // постер кликабельный (используется трижды: два blur-фона + сам alt-постер),
    // ищем именно кликабельный по title, а не по alt (blur-слои имеют alt="")
    const clickablePoster = screen.getByTitle('Нажмите для просмотра в полном размере')
    expect(clickablePoster).toHaveAttribute('src', '/poster.jpg')
    expect(clickablePoster).toHaveAttribute('alt', 'Атака титанов')
  })

  it('рендерит плейсхолдер-иконку вместо постера, когда posterUrl не задан', () => {
    const { container } = renderWithProvider(<AnimeHeroBase name="Атака титанов" />)

    expect(screen.queryByTitle('Нажмите для просмотра в полном размере')).not.toBeInTheDocument()
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('открывает лайтбокс по клику на постер', async () => {
    const user = userEvent.setup()
    renderWithProvider(<AnimeHeroBase name="Атака титанов" posterUrl="/poster.jpg" />)

    await user.click(screen.getByTitle('Нажмите для просмотра в полном размере'))

    // лайтбокс открыт — постер повторно виден с тем же alt (getAllByAltText вместо getByAltText,
    // т.к. кликабельный постер в Hero тоже имеет alt=name)
    expect(screen.getAllByAltText('Атака титанов').length).toBeGreaterThan(1)
  })

  it('рендерит переданные слоты (бейджи/метаданные/теги/CTA)', () => {
    renderWithProvider(
      <AnimeHeroBase
        name="Атака титанов"
        badgesSlot={<div data-testid="badges">Badges</div>}
        metaSlot={<div data-testid="meta">Meta</div>}
        tagsSlot={<div data-testid="tags">Tags</div>}
        ctaSlot={<div data-testid="cta">CTA</div>}
      />,
    )

    expect(screen.getByTestId('badges')).toBeInTheDocument()
    expect(screen.getByTestId('meta')).toBeInTheDocument()
    expect(screen.getByTestId('tags')).toBeInTheDocument()
    expect(screen.getByTestId('cta')).toBeInTheDocument()
  })

  it('рендерит posterOverlaySlot поверх постера', () => {
    renderWithProvider(
      <AnimeHeroBase
        name="Атака титанов"
        posterUrl="/poster.jpg"
        posterOverlaySlot={<div data-testid="poster-overlay">Progress</div>}
      />,
    )

    expect(screen.getByTestId('poster-overlay')).toBeInTheDocument()
  })

  it('не рендерит PosterLightbox вообще, когда posterUrl не задан', () => {
    renderWithProvider(<AnimeHeroBase name="Атака титанов" />)

    // без posterUrl <PosterLightbox> не монтируется — нет скрытого alt-изображения
    expect(screen.queryAllByRole('img').length).toBe(0)
  })
})
