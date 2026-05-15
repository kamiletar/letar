import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FieldSwitch', () => {
  describe('рендеринг', () => {
    it('рендерит переключатель', () => {
      render(
        <Form initialValue={{ active: false }} onSubmit={vi.fn()}>
          <Form.Field.Switch name="active" label="Активен" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByText('Активен')).toBeInTheDocument()
      expect(screen.getByRole('checkbox')).toBeInTheDocument()
    })

    it('рендерит с начальным значением true', () => {
      render(
        <Form initialValue={{ active: true }} onSubmit={vi.fn()}>
          <Form.Field.Switch name="active" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByRole('checkbox')).toBeChecked()
    })

    it('рендерит с начальным значением false', () => {
      render(
        <Form initialValue={{ active: false }} onSubmit={vi.fn()}>
          <Form.Field.Switch name="active" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByRole('checkbox')).not.toBeChecked()
    })
  })

  describe('взаимодействие', () => {
    it('переключает значение при клике', async () => {
      const user = userEvent.setup()
      render(
        <Form initialValue={{ active: false }} onSubmit={vi.fn()}>
          <Form.Field.Switch name="active" />
        </Form>,
        { wrapper: TestWrapper },
      )

      const toggle = screen.getByRole('checkbox')
      expect(toggle).not.toBeChecked()

      await user.click(toggle)
      expect(toggle).toBeChecked()
    })
  })

  describe('состояния', () => {
    it('рендерит в disabled состоянии', () => {
      render(
        <Form initialValue={{ active: false }} onSubmit={vi.fn()}>
          <Form.Field.Switch name="active" disabled />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByRole('checkbox')).toBeDisabled()
    })

    it('наследует disabled из формы', () => {
      render(
        <Form initialValue={{ active: false }} onSubmit={vi.fn()} disabled>
          <Form.Field.Switch name="active" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByRole('checkbox')).toBeDisabled()
    })

    it('рендерит helperText', () => {
      render(
        <Form initialValue={{ active: false }} onSubmit={vi.fn()}>
          <Form.Field.Switch name="active" helperText="Включить уведомления" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByText('Включить уведомления')).toBeInTheDocument()
    })
  })
})
