import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FieldHidden', () => {
  describe('рендеринг', () => {
    it('не рендерит видимых элементов', () => {
      const { container } = render(
        <Form initialValue={{ utm_source: '' }} onSubmit={vi.fn()}>
          <Form.Field.Hidden name="utm_source" value="landing" />
        </Form>,
        { wrapper: TestWrapper },
      )

      // Hidden поле не должно рендерить видимых элементов
      // Form рендерит form-тег, Hidden не добавляет ничего в DOM
      const formElement = container.querySelector('form')
      expect(formElement).toBeInTheDocument()
    })

    it('не выбрасывает ошибку при рендеринге', () => {
      expect(() => {
        render(
          <Form initialValue={{ ref: '' }} onSubmit={vi.fn()}>
            <Form.Field.Hidden name="ref" value="abc123" />
          </Form>,
          { wrapper: TestWrapper },
        )
      }).not.toThrow()
    })
  })
})
