import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FieldYesNo', () => {
  describe('рендеринг', () => {
    it('рендерит два варианта выбора', () => {
      render(
        <Form initialValue={{ agree: null }} onSubmit={vi.fn()}>
          <Form.Field.YesNo name="agree" label="Согласны?" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByText('Согласны?')).toBeInTheDocument()
      const radios = screen.getAllByRole('radio')
      expect(radios).toHaveLength(2)
    })

    it('рендерит кастомные labels', () => {
      render(
        <Form initialValue={{ agree: null }} onSubmit={vi.fn()}>
          <Form.Field.YesNo name="agree" yesLabel="Конечно" noLabel="Нет, спасибо" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByText('Конечно')).toBeInTheDocument()
      expect(screen.getByText('Нет, спасибо')).toBeInTheDocument()
    })
  })

  describe('взаимодействие', () => {
    it('выбирает Да при клике', async () => {
      const user = userEvent.setup()
      render(
        <Form initialValue={{ agree: null }} onSubmit={vi.fn()}>
          <Form.Field.YesNo name="agree" yesLabel="Да" noLabel="Нет" />
        </Form>,
        { wrapper: TestWrapper },
      )

      const yesRadio = screen.getAllByRole('radio')[0]
      await user.click(yesRadio)
      expect(yesRadio).toHaveAttribute('aria-checked', 'true')
    })
  })

  describe('состояния', () => {
    it('рендерит helperText', () => {
      render(
        <Form initialValue={{ agree: null }} onSubmit={vi.fn()}>
          <Form.Field.YesNo name="agree" helperText="Обязательное поле" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByText('Обязательное поле')).toBeInTheDocument()
    })
  })
})
