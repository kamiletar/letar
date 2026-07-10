import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

const rows = [
  { value: 'speed', label: 'Скорость' },
  { value: 'quality', label: 'Качество' },
]

const columns = [
  { value: '1', label: 'Плохо' },
  { value: '2', label: 'Средне' },
  { value: '3', label: 'Хорошо' },
]

describe('FieldMatrixChoice', () => {
  describe('рендеринг', () => {
    it('рендерит матрицу с label', () => {
      render(
        <Form initialValue={{ matrix: {} }} onSubmit={vi.fn()}>
          <Form.Field.MatrixChoice name="matrix" label="Оценка" rows={rows} columns={columns} />
        </Form>,
        { wrapper: TestWrapper }
      )

      expect(screen.getByText('Оценка')).toBeInTheDocument()
    })

    it('рендерит таблицу на десктопе', () => {
      const { container } = render(
        <Form initialValue={{ matrix: {} }} onSubmit={vi.fn()}>
          <Form.Field.MatrixChoice name="matrix" rows={rows} columns={columns} />
        </Form>,
        { wrapper: TestWrapper }
      )

      // Матрица использует Table.Root
      expect(container.querySelector('table')).toBeInTheDocument()
    })
  })

  describe('состояния', () => {
    it('рендерит helperText', () => {
      render(
        <Form initialValue={{ matrix: {} }} onSubmit={vi.fn()}>
          <Form.Field.MatrixChoice
            name="matrix"
            rows={rows}
            columns={columns}
            helperText="Выберите оценку для каждого критерия"
          />
        </Form>,
        { wrapper: TestWrapper }
      )

      expect(screen.getByText('Выберите оценку для каждого критерия')).toBeInTheDocument()
    })
  })
})
