import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useInlineCrudList } from './use-inline-crud-list'

interface Item {
  id: string
}

describe('useInlineCrudList', () => {
  it('вызывает onError и не убирает элемент из списка, если onDelete бросил исключение', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const onError = vi.fn()
    const { result } = renderHook(() =>
      useInlineCrudList<Item, Item>({
        initialItems: [{ id: '1' }],
        getId: (item) => item.id,
        onCreate: vi.fn(),
        onUpdate: vi.fn(),
        onDelete: vi.fn().mockRejectedValue(new Error('FK violation')),
        onError,
      })
    )

    act(() => {
      result.current.handleDelete('1')
    })

    await waitFor(() => expect(onError).toHaveBeenCalledWith(new Error('FK violation'), 'delete'))
    expect(result.current.items).toEqual([{ id: '1' }])
  })

  it('пробрасывает исключение из handleCreate дальше — форма не должна выглядеть сохранённой', async () => {
    const onError = vi.fn()
    const { result } = renderHook(() =>
      useInlineCrudList<Item, Item>({
        initialItems: [],
        getId: (item) => item.id,
        onCreate: vi.fn().mockRejectedValue(new Error('unique violation')),
        onUpdate: vi.fn(),
        onDelete: vi.fn(),
        onError,
      })
    )

    await expect(result.current.handleCreate({ id: '1' })).rejects.toThrow('unique violation')
    expect(onError).toHaveBeenCalledWith(new Error('unique violation'), 'create')
    expect(result.current.items).toEqual([])
  })

  it('пробрасывает исключение из handleUpdate дальше', async () => {
    const onError = vi.fn()
    const { result } = renderHook(() =>
      useInlineCrudList<Item, Item>({
        initialItems: [{ id: '1' }],
        getId: (item) => item.id,
        onCreate: vi.fn(),
        onUpdate: vi.fn().mockRejectedValue(new Error('policy denial')),
        onDelete: vi.fn(),
        onError,
      })
    )

    await expect(result.current.handleUpdate('1', { id: '1' })).rejects.toThrow('policy denial')
    expect(onError).toHaveBeenCalledWith(new Error('policy denial'), 'update')
    expect(result.current.items).toEqual([{ id: '1' }])
  })

  it('без onError не бросает необработанное исключение при delete', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const onDelete = vi.fn().mockRejectedValue(new Error('FK violation'))
    const { result } = renderHook(() =>
      useInlineCrudList<Item, Item>({
        initialItems: [{ id: '1' }],
        getId: (item) => item.id,
        onCreate: vi.fn(),
        onUpdate: vi.fn(),
        onDelete,
      })
    )

    act(() => {
      result.current.handleDelete('1')
    })

    await waitFor(() => expect(onDelete).toHaveBeenCalled())
    expect(result.current.items).toEqual([{ id: '1' }])
  })
})
