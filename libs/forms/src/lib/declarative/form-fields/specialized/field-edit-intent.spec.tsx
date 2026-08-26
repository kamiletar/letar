import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FieldEditIntent', () => {
  describe('view mode', () => {
    it('показывает displayValue и кнопку «Заменить», дочернее поле не смонтировано', () => {
      render(
        <Form initialValue={{ apiKey: { isEdited: false, value: null } }} onSubmit={vi.fn()}>
          <Form.Field.EditIntent name="apiKey" displayValue="************P9x4" emptyValue="">
            <Form.Field.Password name="apiKey.value" />
          </Form.Field.EditIntent>
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByText('************P9x4')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Заменить' })).toBeInTheDocument()
      expect(screen.queryByLabelText(/toggle password/i)).not.toBeInTheDocument()
    })

    it('поддерживает кастомный editLabel', () => {
      render(
        <Form initialValue={{ apiKey: { isEdited: false, value: null } }} onSubmit={vi.fn()}>
          <Form.Field.EditIntent name="apiKey" displayValue="****" editLabel="Обновить ключ" emptyValue="">
            <Form.Field.Password name="apiKey.value" />
          </Form.Field.EditIntent>
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByRole('button', { name: 'Обновить ключ' })).toBeInTheDocument()
    })
  })

  describe('переход view → edit → cancel', () => {
    it('клик «Заменить» монтирует дочернее поле и переводит фокус в него', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <Form initialValue={{ apiKey: { isEdited: false, value: null } }} onSubmit={vi.fn()}>
          <Form.Field.EditIntent name="apiKey" displayValue="****" emptyValue="">
            <Form.Field.Password name="apiKey.value" />
          </Form.Field.EditIntent>
        </Form>,
        { wrapper: TestWrapper },
      )

      await user.click(screen.getByRole('button', { name: 'Заменить' }))

      const input = container.querySelector('input[type="password"]')
      expect(input).toBeInTheDocument()
      expect(input).toHaveFocus()
      expect(screen.getByRole('button', { name: 'Оставить текущее' })).toBeInTheDocument()
    })

    it('клик «Оставить текущее» размонтирует дочернее поле и возвращает view mode', async () => {
      const user = userEvent.setup()
      render(
        <Form initialValue={{ apiKey: { isEdited: true, value: 'sk_live_x' } }} onSubmit={vi.fn()}>
          <Form.Field.EditIntent name="apiKey" displayValue="****" emptyValue="">
            <Form.Field.Password name="apiKey.value" />
          </Form.Field.EditIntent>
        </Form>,
        { wrapper: TestWrapper },
      )

      await user.click(screen.getByRole('button', { name: 'Оставить текущее' }))

      expect(screen.getByRole('button', { name: 'Заменить' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Заменить' })).toHaveFocus()
      expect(screen.queryByLabelText(/toggle password/i)).not.toBeInTheDocument()
    })
  })

  describe('create mode', () => {
    it('стартует сразу в edit mode при initialValue isEdited: true', () => {
      render(
        <Form initialValue={{ apiKey: { isEdited: true, value: '' } }} onSubmit={vi.fn()}>
          <Form.Field.EditIntent name="apiKey" displayValue="****" emptyValue="">
            <Form.Field.Password name="apiKey.value" />
          </Form.Field.EditIntent>
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByLabelText(/toggle password/i)).toBeInTheDocument()
      expect(screen.queryByText('****')).not.toBeInTheDocument()
    })
  })

  describe('submit', () => {
    it('при isEdited: false отправляет {isEdited: false, value: null}', async () => {
      const onSubmit = vi.fn()
      render(
        <Form initialValue={{ apiKey: { isEdited: false, value: null } }} onSubmit={onSubmit}>
          <Form.Field.EditIntent name="apiKey" displayValue="****" emptyValue="">
            <Form.Field.Password name="apiKey.value" />
          </Form.Field.EditIntent>
          <Form.Button.Submit>Сохранить</Form.Button.Submit>
        </Form>,
        { wrapper: TestWrapper },
      )

      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Сохранить' }))

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ apiKey: { isEdited: false, value: null } }),
      )
    })

    it('после ввода нового значения отправляет {isEdited: true, value: "..."}', async () => {
      const onSubmit = vi.fn()
      const user = userEvent.setup()
      const { container } = render(
        <Form initialValue={{ apiKey: { isEdited: false, value: null } }} onSubmit={onSubmit}>
          <Form.Field.EditIntent name="apiKey" displayValue="****" emptyValue="">
            <Form.Field.Password name="apiKey.value" />
          </Form.Field.EditIntent>
          <Form.Button.Submit>Сохранить</Form.Button.Submit>
        </Form>,
        { wrapper: TestWrapper },
      )

      await user.click(screen.getByRole('button', { name: 'Заменить' }))
      const input = container.querySelector('input[type="password"]') as HTMLInputElement
      await user.type(input, 'sk_live_new_secret')
      await user.click(screen.getByRole('button', { name: 'Сохранить' }))

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ apiKey: { isEdited: true, value: 'sk_live_new_secret' } }),
      )
    })
  })
})
