import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FieldDuration', () => {
  describe('рендеринг', () => {
    it('рендерит поле длительности с двумя spinbutton (часы:минуты)', () => {
      render(
        <Form initialValue={{ duration: '' }} onSubmit={vi.fn()}>
          <Form.Field.Duration name="duration" label="Длительность" />
        </Form>,
        { wrapper: TestWrapper }
      )

      expect(screen.getByText('Длительность')).toBeInTheDocument()
      // Два spinbutton — часы и минуты
      const spinbuttons = screen.getAllByRole('spinbutton')
      expect(spinbuttons.length).toBeGreaterThanOrEqual(2)
    })

    it('рендерит разделитель двоеточие', () => {
      render(
        <Form initialValue={{ duration: '' }} onSubmit={vi.fn()}>
          <Form.Field.Duration name="duration" />
        </Form>,
        { wrapper: TestWrapper }
      )

      expect(screen.getByText(':')).toBeInTheDocument()
    })
  })

  describe('состояния', () => {
    it('рендерит в disabled состоянии', () => {
      render(
        <Form initialValue={{ duration: '' }} onSubmit={vi.fn()}>
          <Form.Field.Duration name="duration" disabled />
        </Form>,
        { wrapper: TestWrapper }
      )

      const spinbuttons = screen.getAllByRole('spinbutton')
      for (const sb of spinbuttons) {
        expect(sb).toBeDisabled()
      }
    })

    it('рендерит helperText', () => {
      render(
        <Form initialValue={{ duration: '' }} onSubmit={vi.fn()}>
          <Form.Field.Duration name="duration" helperText="Формат: HH:MM" />
        </Form>,
        { wrapper: TestWrapper }
      )

      expect(screen.getByText('Формат: HH:MM')).toBeInTheDocument()
    })
  })
})
