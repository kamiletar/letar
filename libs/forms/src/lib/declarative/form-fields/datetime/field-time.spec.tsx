import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FieldTime', () => {
  describe('рендеринг', () => {
    it('рендерит поле времени', () => {
      render(
        <Form initialValue={{ startTime: '' }} onSubmit={vi.fn()}>
          <Form.Field.Time name="startTime" label="Время начала" />
        </Form>,
        { wrapper: TestWrapper }
      )

      expect(screen.getByText('Время начала')).toBeInTheDocument()
    })

    it('устанавливает data-field-name', () => {
      const { container } = render(
        <Form initialValue={{ startTime: '' }} onSubmit={vi.fn()}>
          <Form.Field.Time name="startTime" />
        </Form>,
        { wrapper: TestWrapper }
      )

      // Нативный input type="time"
      const input = container.querySelector('[data-field-name="startTime"]')
      expect(input).toBeInTheDocument()
    })
  })

  describe('состояния', () => {
    it('рендерит в disabled состоянии', () => {
      const { container } = render(
        <Form initialValue={{ startTime: '' }} onSubmit={vi.fn()}>
          <Form.Field.Time name="startTime" disabled />
        </Form>,
        { wrapper: TestWrapper }
      )

      const input = container.querySelector('input[type="time"]')
      expect(input).toBeDisabled()
    })

    it('рендерит helperText', () => {
      render(
        <Form initialValue={{ startTime: '' }} onSubmit={vi.fn()}>
          <Form.Field.Time name="startTime" helperText="Формат 24 часа" />
        </Form>,
        { wrapper: TestWrapper }
      )

      expect(screen.getByText('Формат 24 часа')).toBeInTheDocument()
    })
  })
})
