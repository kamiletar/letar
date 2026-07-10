import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

const options = [
  { label: 'Бесплатный', value: 'free', description: '0 ₽/мес' },
  { label: 'Про', value: 'pro', description: '990 ₽/мес' },
  { label: 'Бизнес', value: 'business', description: '2990 ₽/мес' },
]

describe('FieldRadioCard', () => {
  describe('rendering', () => {
    it('рендерит radio group', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ plan: '' }} onSubmit={vi.fn()}>
            <Form.Field.RadioCard name="plan" options={options} />
          </Form>
        </TestWrapper>
      )

      const radios = screen.getAllByRole('radio')
      expect(radios.length).toBe(3)
    })

    it('рендерит label', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ plan: '' }} onSubmit={vi.fn()}>
            <Form.Field.RadioCard name="plan" label="Тарифный план" options={options} />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByText('Тарифный план')).toBeInTheDocument()
    })

    it('рендерит опции с описаниями', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ plan: '' }} onSubmit={vi.fn()}>
            <Form.Field.RadioCard name="plan" options={options} />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByText('Бесплатный')).toBeInTheDocument()
      expect(screen.getByText('0 ₽/мес')).toBeInTheDocument()
      expect(screen.getByText('Про')).toBeInTheDocument()
    })
  })

  describe('initial value', () => {
    it('выбирает начальное значение', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ plan: 'pro' }} onSubmit={vi.fn()}>
            <Form.Field.RadioCard name="plan" options={options} />
          </Form>
        </TestWrapper>
      )

      const proRadio = screen.getAllByRole('radio')[1]
      expect(proRadio).toBeChecked()
    })
  })
})
