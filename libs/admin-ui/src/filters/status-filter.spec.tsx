import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FilterOption } from '../types'
import { StatusFilter } from './status-filter'

/** Обёртка с Chakra-провайдером — компонент использует токены темы */
function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

const options: FilterOption[] = [
  { value: 'true', label: 'Опубликовано' },
  { value: 'false', label: 'Скрыто' },
]

function mockRouting({ pathname = '/admin/products', search = '' }: { pathname?: string; search?: string } = {}) {
  const push = vi.fn()
  vi.mocked(useRouter).mockReturnValue({
    push,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname,
    query: {},
    asPath: pathname,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
  vi.mocked(usePathname).mockReturnValue(pathname)
  vi.mocked(useSearchParams).mockReturnValue(
    new URLSearchParams(search) as unknown as ReturnType<typeof useSearchParams>,
  )
  return { push }
}

describe('StatusFilter', () => {
  beforeEach(() => {
    mockRouting()
  })

  it('рендерит кнопку "Все" и все опции фильтра', () => {
    renderWithProvider(<StatusFilter paramName="published" options={options} />)

    expect(screen.getByRole('button', { name: 'Все' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Опубликовано' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Скрыто' })).toBeInTheDocument()
  })

  it('не рендерит кнопку "Все", если showAll=false', () => {
    renderWithProvider(<StatusFilter paramName="published" options={options} showAll={false} />)
    expect(screen.queryByRole('button', { name: 'Все' })).not.toBeInTheDocument()
  })

  it('клик по опции обновляет URL с параметром фильтра и сбрасывает page', async () => {
    const user = userEvent.setup()
    const { push } = mockRouting({ search: 'page=3' })
    renderWithProvider(<StatusFilter paramName="published" options={options} />)

    await user.click(screen.getByRole('button', { name: 'Опубликовано' }))

    expect(push).toHaveBeenCalledWith('/admin/products?published=true')
  })

  it('клик по "Все" удаляет параметр фильтра из URL', async () => {
    const user = userEvent.setup()
    const { push } = mockRouting({ search: 'published=true' })
    renderWithProvider(<StatusFilter paramName="published" options={options} />)

    await user.click(screen.getByRole('button', { name: 'Все' }))

    expect(push).toHaveBeenCalledWith('/admin/products?')
  })

  it('использует кастомную colorPalette без ошибок рендера', () => {
    renderWithProvider(<StatusFilter paramName="published" options={options} colorPalette="green" />)
    expect(screen.getByRole('button', { name: 'Опубликовано' })).toBeInTheDocument()
  })
})
