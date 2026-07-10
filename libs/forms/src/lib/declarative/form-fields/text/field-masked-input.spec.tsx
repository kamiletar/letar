import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FieldMaskedInput', () => {
  describe('рендеринг', () => {
    it('рендерит input с маской', () => {
      render(
        <Form initialValue={{ code: '' }} onSubmit={vi.fn()}>
          <Form.Field.MaskedInput name="code" label="Код" mask="999-999" />
        </Form>,
        { wrapper: TestWrapper }
      )

      expect(screen.getByText('Код')).toBeInTheDocument()
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('устанавливает data-field-name', () => {
      render(
        <Form initialValue={{ code: '' }} onSubmit={vi.fn()}>
          <Form.Field.MaskedInput name="code" mask="999-999" />
        </Form>,
        { wrapper: TestWrapper }
      )

      expect(screen.getByRole('textbox')).toHaveAttribute('data-field-name', 'code')
    })

    it('рендерит placeholder', () => {
      render(
        <Form initialValue={{ code: '' }} onSubmit={vi.fn()}>
          <Form.Field.MaskedInput name="code" mask="999-999" placeholder="___-___" />
        </Form>,
        { wrapper: TestWrapper }
      )

      expect(screen.getByPlaceholderText('___-___')).toBeInTheDocument()
    })
  })

  describe('состояния', () => {
    it('рендерит в disabled состоянии', () => {
      render(
        <Form initialValue={{ code: '' }} onSubmit={vi.fn()}>
          <Form.Field.MaskedInput name="code" mask="999-999" disabled />
        </Form>,
        { wrapper: TestWrapper }
      )

      expect(screen.getByRole('textbox')).toBeDisabled()
    })

    it('рендерит helperText', () => {
      render(
        <Form initialValue={{ code: '' }} onSubmit={vi.fn()}>
          <Form.Field.MaskedInput name="code" mask="999-999" helperText="Формат: XXX-XXX" />
        </Form>,
        { wrapper: TestWrapper }
      )

      expect(screen.getByText('Формат: XXX-XXX')).toBeInTheDocument()
    })
  })
})
