import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, renderHook, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod/v4'

import { useZenStackRelations, type ZenStackSchema } from '../zenstack'

/** Минимальная схема ZenStack: клиенту запросов нужны только имена моделей */
const zenSchema = {
  models: {
    Category: { name: 'Category', fields: {} },
    Tag: { name: 'Tag', fields: {} },
  },
} as unknown as ZenStackSchema

const relation = (model: string, labelField: string) => ({
  ui: { fieldProps: { relation: { model, labelField } } },
})

const FormSchema = z.object({
  title: z.string(),
  categoryId: z.string().meta(relation('Category', 'name')),
  tagId: z.string().meta(relation('Tag', 'title')),
})

const requests: string[] = []

beforeEach(() => {
  requests.length = 0
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      requests.push(String(url))
      const rows = String(url).includes('/category/') ? [{ id: 'c1', name: 'Хлеб' }] : [{ id: 't1', title: 'Быстро' }]
      return new Response(JSON.stringify({ data: rows }), { headers: { 'content-type': 'application/json' } })
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

describe('useZenStackRelations', () => {
  it('собирает конфиги по relation формы: модель, подпись, useQuery', () => {
    const { result } = renderHook(() => useZenStackRelations(zenSchema, FormSchema), { wrapper })

    expect(result.current.map((r) => [r.model, r.labelField])).toEqual([['Category', 'name'], ['Tag', 'title']])
    expect(result.current.every((r) => typeof r.useQuery === 'function')).toBe(true)
  })

  it('useQuery читает записи модели через findMany ZenStack и передаёт аргументы', async () => {
    const { result } = renderHook(() => useZenStackRelations(zenSchema, FormSchema), { wrapper })
    const category = result.current.find((r) => r.model === 'Category')!

    // Загрузчик провайдера зовёт useQuery из своего компонента — здесь так же
    function Loader() {
      const { data } = category.useQuery({ orderBy: { name: 'asc' } })
      return <div data-testid="names">{(data ?? []).map((row) => (row as { name: string }).name).join(',')}</div>
    }
    render(<Loader />, { wrapper })

    await waitFor(() => expect(screen.getByTestId('names').textContent).toBe('Хлеб'))
    expect(requests).toHaveLength(1)
    expect(requests[0]).toContain('/category/findMany')
    expect(decodeURIComponent(requests[0] ?? '')).toContain('"orderBy":{"name":"asc"}')
  })

  it('overrides меняют настройки модели, exclude выкидывает модель', () => {
    const overrides = { Category: { labelField: 'title', queryArgs: { take: 5 } } }
    const exclude = ['Tag']
    const { result } = renderHook(() => useZenStackRelations(zenSchema, FormSchema, { overrides, exclude }), {
      wrapper,
    })

    expect(result.current).toHaveLength(1)
    expect(result.current[0]).toMatchObject({ model: 'Category', labelField: 'title', queryArgs: { take: 5 } })
  })

  it('модели нет в схеме ZenStack — понятная ошибка со списком моделей', () => {
    const schema = z.object({ bad: z.string().meta(relation('Missing', 'name')) })
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(() => renderHook(() => useZenStackRelations(zenSchema, schema), { wrapper })).toThrow(
      /«Missing».*«bad».*Category, Tag/,
    )
    error.mockRestore()
  })

  it('массив стабилен между рендерами при тех же аргументах', () => {
    const { result, rerender } = renderHook(() => useZenStackRelations(zenSchema, FormSchema), { wrapper })
    const first = result.current

    rerender()

    expect(result.current).toBe(first)
  })
})
