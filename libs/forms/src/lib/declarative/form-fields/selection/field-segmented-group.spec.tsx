import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'

// zag-js использует ResizeObserver для синхронизации индикатора
beforeAll(() => {
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver
  }
})

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

const options = [
  { label: 'День', value: 'day' },
  { label: 'Неделя', value: 'week' },
  { label: 'Месяц', value: 'month' },
]

describe('FieldSegmentedGroup', () => {
  describe('rendering', () => {
    it('рендерит segmented group', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ period: 'day' }} onSubmit={vi.fn()}>
            <Form.Field.SegmentedGroup name="period" options={options} />
          </Form>
        </TestWrapper>,
      )

      // SegmentGroup рендерит radio элементы
      const radios = screen.getAllByRole('radio')
      expect(radios.length).toBe(3)
    })

    it('рендерит label', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ period: 'day' }} onSubmit={vi.fn()}>
            <Form.Field.SegmentedGroup name="period" label="Период" options={options} />
          </Form>
        </TestWrapper>,
      )

      expect(screen.getByText('Период')).toBeInTheDocument()
    })

    it('рендерит все опции', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ period: 'day' }} onSubmit={vi.fn()}>
            <Form.Field.SegmentedGroup name="period" options={options} />
          </Form>
        </TestWrapper>,
      )

      expect(screen.getByText('День')).toBeInTheDocument()
      expect(screen.getByText('Неделя')).toBeInTheDocument()
      expect(screen.getByText('Месяц')).toBeInTheDocument()
    })
  })
})
