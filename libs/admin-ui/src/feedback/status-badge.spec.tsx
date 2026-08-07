import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { createStatusBadge, StatusBadge } from './status-badge'

/** Обёртка с Chakra-провайдером — Badge использует recipe-систему темы */
function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('StatusBadge', () => {
  it('рендерит "Опубликовано" для published=true', () => {
    renderWithProvider(<StatusBadge type="published" value={true} />)
    expect(screen.getByText('Опубликовано')).toBeInTheDocument()
  })

  it('рендерит "Скрыто" для published=false', () => {
    renderWithProvider(<StatusBadge type="published" value={false} />)
    expect(screen.getByText('Скрыто')).toBeInTheDocument()
  })

  it('рендерит "В наличии" для inStock=true', () => {
    renderWithProvider(<StatusBadge type="inStock" value={true} />)
    expect(screen.getByText('В наличии')).toBeInTheDocument()
  })

  it('рендерит "Нет в наличии" для inStock=false', () => {
    renderWithProvider(<StatusBadge type="inStock" value={false} />)
    expect(screen.getByText('Нет в наличии')).toBeInTheDocument()
  })

  it('рендерит корректную метку для строкового значения order', () => {
    renderWithProvider(<StatusBadge type="order" value="CONFIRMED" />)
    expect(screen.getByText('Подтверждён')).toBeInTheDocument()
  })

  it('рендерит все статусы заказа', () => {
    const cases: Array<[string, string]> = [
      ['PENDING', 'Ожидает'],
      ['CONFIRMED', 'Подтверждён'],
      ['SHIPPED', 'Отправлен'],
      ['DELIVERED', 'Доставлен'],
      ['CANCELLED', 'Отменён'],
    ]

    for (const [value, label] of cases) {
      const { unmount } = renderWithProvider(<StatusBadge type="order" value={value} />)
      expect(screen.getByText(label)).toBeInTheDocument()
      unmount()
    }
  })

  it('падает на fallback "Неизвестно" для нераспознанного значения order', () => {
    renderWithProvider(<StatusBadge type="order" value="SOME_UNKNOWN_STATUS" />)
    expect(screen.getByText('Неизвестно')).toBeInTheDocument()
  })
})

describe('createStatusBadge', () => {
  it('создаёт кастомный StatusBadge с собственной конфигурацией', () => {
    const CustomBadge = createStatusBadge<'priority'>({
      priority: {
        high: { color: 'red', label: 'Высокий' },
        low: { color: 'gray', label: 'Низкий' },
      },
    })

    renderWithProvider(<CustomBadge type="priority" value="high" />)
    expect(screen.getByText('Высокий')).toBeInTheDocument()
  })

  it('падает на дефолтный fallback "Неизвестно", если значения нет в конфигурации', () => {
    const CustomBadge = createStatusBadge<'priority'>({
      priority: {
        high: { color: 'red', label: 'Высокий' },
      },
    })

    renderWithProvider(<CustomBadge type="priority" value="does-not-exist" />)
    expect(screen.getByText('Неизвестно')).toBeInTheDocument()
  })
})
