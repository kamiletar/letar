import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusBadge, type StatusConfig } from './status-badge'

import type { ReactNode } from 'react'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'

const ORDER_STATUS_CONFIG: Record<OrderStatus, StatusConfig> = {
  PENDING: { label: 'Ожидает', colorPalette: 'yellow' },
  CONFIRMED: { label: 'Подтверждён', colorPalette: 'blue' },
  COMPLETED: { label: 'Завершён', colorPalette: 'green' },
  CANCELLED: { label: 'Отменён', colorPalette: 'red' },
}

function DotIcon() {
  return <svg data-testid="dot-icon" />
}

describe('StatusBadge', () => {
  it('рендерит label из конфига для известного статуса', () => {
    renderWithProvider(<StatusBadge status="PENDING" config={ORDER_STATUS_CONFIG} />)
    expect(screen.getByText('Ожидает')).toBeInTheDocument()
  })

  it('рендерит разные варианты статуса с соответствующими лейблами', () => {
    const { rerender } = renderWithProvider(<StatusBadge status="CONFIRMED" config={ORDER_STATUS_CONFIG} />)
    expect(screen.getByText('Подтверждён')).toBeInTheDocument()

    rerender(
      <ChakraProvider value={defaultSystem}>
        <StatusBadge status="COMPLETED" config={ORDER_STATUS_CONFIG} />
      </ChakraProvider>,
    )
    expect(screen.getByText('Завершён')).toBeInTheDocument()

    rerender(
      <ChakraProvider value={defaultSystem}>
        <StatusBadge status="CANCELLED" config={ORDER_STATUS_CONFIG} />
      </ChakraProvider>,
    )
    expect(screen.getByText('Отменён')).toBeInTheDocument()
  })

  it('падает обратно на сырое значение статуса, если его нет в конфиге', () => {
    renderWithProvider(
      <StatusBadge
        status={'UNKNOWN_STATUS' as OrderStatus}
        config={ORDER_STATUS_CONFIG}
      />,
    )
    expect(screen.getByText('UNKNOWN_STATUS')).toBeInTheDocument()
  })

  it('рендерит иконку из конфига, если showIcon не отключён', () => {
    const configWithIcon: Record<'ACTIVE', StatusConfig> = {
      ACTIVE: { label: 'Активен', colorPalette: 'green', icon: DotIcon },
    }
    renderWithProvider(<StatusBadge status="ACTIVE" config={configWithIcon} />)
    expect(screen.getByTestId('dot-icon')).toBeInTheDocument()
  })

  it('не рендерит иконку при showIcon=false', () => {
    const configWithIcon: Record<'ACTIVE', StatusConfig> = {
      ACTIVE: { label: 'Активен', colorPalette: 'green', icon: DotIcon },
    }
    renderWithProvider(<StatusBadge status="ACTIVE" config={configWithIcon} showIcon={false} />)
    expect(screen.queryByTestId('dot-icon')).not.toBeInTheDocument()
  })

  it('children переопределяет label', () => {
    renderWithProvider(
      <StatusBadge status="PENDING" config={ORDER_STATUS_CONFIG}>
        Кастомный текст
      </StatusBadge>,
    )
    expect(screen.getByText('Кастомный текст')).toBeInTheDocument()
    expect(screen.queryByText('Ожидает')).not.toBeInTheDocument()
  })

  it('children переопределяет фолбэк для неизвестного статуса', () => {
    renderWithProvider(
      <StatusBadge status={'UNKNOWN' as OrderStatus} config={ORDER_STATUS_CONFIG}>
        Кастом
      </StatusBadge>,
    )
    expect(screen.getByText('Кастом')).toBeInTheDocument()
  })
})
