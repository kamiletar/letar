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
        { wrapper: TestWrapper },
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
        { wrapper: TestWrapper },
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
        { wrapper: TestWrapper },
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
        { wrapper: TestWrapper },
      )

      expect(screen.getByText('Формат: HH:MM')).toBeInTheDocument()
    })
  })

  describe('цели касания (FM-021)', () => {
    const readCss = () =>
      Array.from(document.querySelectorAll('style'))
        .map((el) => el.textContent ?? '')
        .join('\n')

    it('HH:MM: степперы получают правило 44×44 под pointer: coarse', () => {
      render(
        <Form initialValue={{ duration: 90 }} onSubmit={vi.fn()}>
          <Form.Field.Duration name="duration" />
        </Form>,
        { wrapper: TestWrapper },
      )

      const css = readCss()
      expect(css).toContain('pointer: coarse')
      expect(css).toContain('data-part="increment-trigger"')
      expect(css).toContain('44px')
      // на сенсорном указателе поле шире 80 px, чтобы вместить два степпера
      expect(css).toContain('144px')
    })

    it('minutes: степперы тоже получают правило 44×44', () => {
      render(
        <Form initialValue={{ duration: 90 }} onSubmit={vi.fn()}>
          <Form.Field.Duration name="duration" format="minutes" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(readCss()).toContain('data-part="decrement-trigger"')
    })
  })
})
