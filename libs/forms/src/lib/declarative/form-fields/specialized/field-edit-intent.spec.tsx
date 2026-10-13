import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { applyServerErrors, Form, mapServerErrors, useFormRef } from '../../../..'

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

  describe('disabled', () => {
    it('в view mode кнопка «Заменить» недоступна, правка не начинается', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <Form initialValue={{ apiKey: { isEdited: false, value: null } }} onSubmit={vi.fn()}>
          <Form.Field.EditIntent name="apiKey" displayValue="****" emptyValue="" disabled>
            <Form.Field.Password name="apiKey.value" />
          </Form.Field.EditIntent>
        </Form>,
        { wrapper: TestWrapper },
      )

      const button = screen.getByRole('button', { name: 'Заменить' })
      expect(button).toBeDisabled()
      await user.click(button)
      expect(container.querySelector('input[type="password"]')).not.toBeInTheDocument()
    })
  })

  describe('после успешной отправки', () => {
    it('введённое значение отправляется один раз, форма остаётся в режиме правки без повторной отправки старого', async () => {
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
      await user.type(container.querySelector('input[type="password"]') as HTMLInputElement, 'sk_new')
      await user.click(screen.getByRole('button', { name: 'Сохранить' }))
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))

      // Дочерний ввод не потерял значение молча: пользователь видит, что отправил (форма не мигает в view mode)
      expect(container.querySelector('input[type="password"]')).toHaveValue('sk_new')
    })
  })

  describe('ошибки', () => {
    it('серверная ошибка на `${name}.value` показывается у дочернего поля', async () => {
      const user = userEvent.setup()

      function ServerErrorForm() {
        const formRef = useFormRef()
        const applyServerError = () => {
          // Так middleware.onError кладёт ответ сервера на поле после неудачного сабмита
          const mapped = mapServerErrors(
            { code: 'P2002', meta: { target: ['apiKey.value'] } },
            { fieldMap: { 'apiKey.value': { field: 'apiKey.value', message: 'Ключ уже используется' } } },
          )
          if (formRef.current) {
            applyServerErrors(formRef.current, mapped)
          }
        }
        return (
          <Form initialValue={{ apiKey: { isEdited: true, value: '' } }} formRef={formRef} onSubmit={vi.fn()}>
            <Form.Field.EditIntent name="apiKey" displayValue="****" emptyValue="">
              <Form.Field.Password name="apiKey.value" label="Ключ" />
            </Form.Field.EditIntent>
            <button type="button" onClick={applyServerError}>
              Применить ошибку
            </button>
          </Form>
        )
      }

      render(<ServerErrorForm />, { wrapper: TestWrapper })
      await user.type(screen.getByLabelText('Ключ'), 'sk_dup')
      await user.click(screen.getByRole('button', { name: 'Применить ошибку' }))

      expect(await screen.findByText('Ключ уже используется')).toBeInTheDocument()
    })
  })

  describe('клавиатура и скринридер', () => {
    it('Enter на «Заменить» начинает правку и переводит фокус в поле', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <Form initialValue={{ apiKey: { isEdited: false, value: null } }} onSubmit={vi.fn()}>
          <Form.Field.EditIntent name="apiKey" displayValue="****" emptyValue="">
            <Form.Field.Password name="apiKey.value" />
          </Form.Field.EditIntent>
        </Form>,
        { wrapper: TestWrapper },
      )

      await user.tab()
      expect(screen.getByRole('button', { name: 'Заменить' })).toHaveFocus()
      await user.keyboard('{Enter}')

      const input = container.querySelector('input[type="password"]') as HTMLInputElement
      expect(input).toBeInTheDocument()
      await waitFor(() => expect(input).toHaveFocus())
    })

    it('«Оставить текущее» достижима с клавиатуры и возвращает фокус на «Заменить»', async () => {
      const user = userEvent.setup()
      render(
        <Form initialValue={{ apiKey: { isEdited: true, value: '' } }} onSubmit={vi.fn()}>
          <Form.Field.EditIntent name="apiKey" displayValue="****" emptyValue="">
            <Form.Field.Password name="apiKey.value" />
          </Form.Field.EditIntent>
        </Form>,
        { wrapper: TestWrapper },
      )

      const cancel = screen.getByRole('button', { name: 'Оставить текущее' })
      cancel.focus()
      await user.keyboard('{Enter}')

      const replace = await screen.findByRole('button', { name: 'Заменить' })
      await waitFor(() => expect(replace).toHaveFocus())
    })

    it('у кнопок есть доступные имена, маска не читается как поле ввода', () => {
      render(
        <Form initialValue={{ apiKey: { isEdited: false, value: null } }} onSubmit={vi.fn()}>
          <Form.Field.EditIntent name="apiKey" displayValue="************P9x4" emptyValue="" editLabel="Обновить ключ">
            <Form.Field.Password name="apiKey.value" />
          </Form.Field.EditIntent>
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByRole('button', { name: 'Обновить ключ' })).toBeInTheDocument()
      // Маска — обычный текст, а не поле: скринридер не предлагает вводить в неё значение
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      expect(screen.getByText('************P9x4').tagName).not.toBe('INPUT')
    })
  })
})
