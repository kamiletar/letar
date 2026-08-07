import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import { TableSkeleton } from './table-skeleton'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('TableSkeleton', () => {
  it('рендерит дефолтное количество строк и колонок (5x4)', () => {
    renderWithProvider(<TableSkeleton />)

    // 5 строк тела таблицы
    expect(screen.getAllByRole('row')).toHaveLength(1 /* header */ + 5 /* body */)

    // Заголовок содержит 4 колонки
    const headerRow = screen.getAllByRole('row')[0]
    expect(headerRow.children).toHaveLength(4)
  })

  it('рендерит кастомное количество строк', () => {
    renderWithProvider(<TableSkeleton rows={3} columns={4} />)

    expect(screen.getAllByRole('row')).toHaveLength(1 + 3)
  })

  it('рендерит кастомное количество колонок', () => {
    renderWithProvider(<TableSkeleton rows={2} columns={6} />)

    const rows = screen.getAllByRole('row')
    for (const row of rows) {
      expect(row.children).toHaveLength(6)
    }
  })

  it('рендерит 0 строк без ошибок, оставляя только заголовок', () => {
    renderWithProvider(<TableSkeleton rows={0} columns={3} />)

    expect(screen.getAllByRole('row')).toHaveLength(1)
  })

  it('каждая ячейка содержит skeleton-заглушку', () => {
    const { container } = renderWithProvider(<TableSkeleton rows={2} columns={2} />)

    // Skeleton рендерится как отдельный элемент внутри каждой ячейки/заголовка:
    // 2 заголовка + 2*2 ячейки = 6
    const cells = container.querySelectorAll('th, td')
    expect(cells).toHaveLength(2 + 4)
    for (const cell of cells) {
      expect(cell.children.length).toBeGreaterThan(0)
    }
  })
})
