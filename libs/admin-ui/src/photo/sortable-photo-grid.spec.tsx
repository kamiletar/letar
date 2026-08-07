import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { SortablePhotoGrid, type SortablePhotoItem } from './sortable-photo-grid'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

const photos: SortablePhotoItem[] = [
  { id: 'p1', imageUrl: '/p1.jpg', alt: 'Фото 1' },
  { id: 'p2', imageUrl: '/p2.jpg', alt: 'Фото 2' },
  { id: 'p3', imageUrl: '/p3.jpg' },
]

describe('SortablePhotoGrid', () => {
  it('рендерит все переданные фото', () => {
    const { container } = renderWithProvider(
      <SortablePhotoGrid items={photos} onReorder={vi.fn()} onDelete={vi.fn()} />,
    )

    expect(screen.getByAltText('Фото 1')).toBeInTheDocument()
    expect(screen.getByAltText('Фото 2')).toBeInTheDocument()
    // фото без alt рендерится с пустым alt="" — такой <img> имеет декоративную роль
    // (не "img") для accessibility-дерева, поэтому считаем через querySelectorAll, не getAllByRole
    expect(container.querySelectorAll('img')).toHaveLength(3)
  })

  it('помечает первое фото бейджем «Главное»', () => {
    renderWithProvider(
      <SortablePhotoGrid items={photos} onReorder={vi.fn()} onDelete={vi.fn()} />,
    )

    expect(screen.getByText('Главное')).toBeInTheDocument()
  })

  it('не рендерит кнопку «Сделать главной», когда onSetCover не передан', () => {
    renderWithProvider(
      <SortablePhotoGrid items={photos} onReorder={vi.fn()} onDelete={vi.fn()} />,
    )

    expect(screen.queryByRole('button', { name: 'Сделать главной' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Уже главное фото' })).not.toBeInTheDocument()
  })

  it('рендерит кнопку «Сделать главной» для не-cover фото, когда onSetCover передан', () => {
    renderWithProvider(
      <SortablePhotoGrid items={photos} onReorder={vi.fn()} onSetCover={vi.fn()} onDelete={vi.fn()} />,
    )

    // p1 — cover (disabled «Уже главное фото»), p2/p3 — обычные
    expect(screen.getByRole('button', { name: 'Уже главное фото' })).toBeDisabled()
    expect(screen.getAllByRole('button', { name: 'Сделать главной' })).toHaveLength(2)
  })

  it('вызывает onSetCover с id фото при клике', async () => {
    const user = userEvent.setup()
    const onSetCover = vi.fn().mockResolvedValue({})
    const onChanged = vi.fn()

    renderWithProvider(
      <SortablePhotoGrid
        items={photos}
        onReorder={vi.fn()}
        onSetCover={onSetCover}
        onDelete={vi.fn()}
        onChanged={onChanged}
      />,
    )

    const setCoverButtons = screen.getAllByRole('button', { name: 'Сделать главной' })
    await user.click(setCoverButtons[0])

    await vi.waitFor(() => {
      expect(onSetCover).toHaveBeenCalledWith('p2')
      expect(onChanged).toHaveBeenCalled()
    })
  })

  it('вызывает onDelete с id фото при клике на «Удалить»', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn().mockResolvedValue({})
    const onChanged = vi.fn()

    renderWithProvider(
      <SortablePhotoGrid items={photos} onReorder={vi.fn()} onDelete={onDelete} onChanged={onChanged} />,
    )

    const deleteButtons = screen.getAllByRole('button', { name: 'Удалить' })
    await user.click(deleteButtons[1])

    await vi.waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith('p2')
      expect(onChanged).toHaveBeenCalled()
    })
  })

  it('показывает текст ошибки, когда onDelete возвращает error, и не вызывает onChanged', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn().mockResolvedValue({ error: 'Не удалось удалить' })
    const onChanged = vi.fn()

    renderWithProvider(
      <SortablePhotoGrid items={photos} onReorder={vi.fn()} onDelete={onDelete} onChanged={onChanged} />,
    )

    await user.click(screen.getAllByRole('button', { name: 'Удалить' })[0])

    expect(await screen.findByText('Не удалось удалить')).toBeInTheDocument()
    expect(onChanged).not.toHaveBeenCalled()
  })

  it('показывает текст ошибки, когда onSetCover возвращает error', async () => {
    const user = userEvent.setup()
    const onSetCover = vi.fn().mockResolvedValue({ error: 'Ошибка сервера' })

    renderWithProvider(
      <SortablePhotoGrid items={photos} onReorder={vi.fn()} onSetCover={onSetCover} onDelete={vi.fn()} />,
    )

    await user.click(screen.getAllByRole('button', { name: 'Сделать главной' })[0])

    expect(await screen.findByText('Ошибка сервера')).toBeInTheDocument()
  })

  it('не рендерит блок ошибки изначально', () => {
    renderWithProvider(
      <SortablePhotoGrid items={photos} onReorder={vi.fn()} onDelete={vi.fn()} />,
    )

    expect(screen.queryByText(/Не удалось/)).not.toBeInTheDocument()
  })

  it('рендерит пустую сетку без ошибок, когда items пуст', () => {
    renderWithProvider(
      <SortablePhotoGrid items={[]} onReorder={vi.fn()} onDelete={vi.fn()} />,
    )

    expect(screen.queryAllByRole('img')).toHaveLength(0)
    expect(screen.queryByText('Главное')).not.toBeInTheDocument()
  })

  it('синхронизирует внутреннее состояние при изменении items снаружи', () => {
    const { container, rerender } = renderWithProvider(
      <SortablePhotoGrid items={photos.slice(0, 1)} onReorder={vi.fn()} onDelete={vi.fn()} />,
    )

    expect(container.querySelectorAll('img')).toHaveLength(1)

    rerender(
      <ChakraProvider value={defaultSystem}>
        <SortablePhotoGrid items={photos} onReorder={vi.fn()} onDelete={vi.fn()} />
      </ChakraProvider>,
    )

    // p3 без alt — декоративный <img>, не считается getAllByRole('img'), поэтому querySelectorAll
    expect(container.querySelectorAll('img')).toHaveLength(3)
  })
})
