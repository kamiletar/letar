import { ChakraProvider, defaultSystem, Field, Input } from '@chakra-ui/react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod/v4'
import { Form } from '../..'
import type { BaseFieldProps } from '../../types'
import { createField, FieldError, type ResolvedFieldProps } from './create-field'
import { FieldWrapper } from './field-wrapper'

// Обёртка для тестов с Chakra UI
const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

// Простые props для тестового поля
interface TestFieldProps extends BaseFieldProps {
  testProp?: string
}

describe('createField', () => {
  describe('displayName', () => {
    it('устанавливает displayName на созданный компонент', () => {
      const TestField = createField<TestFieldProps, string>({
        displayName: 'TestField',
        render: ({ field, resolved }) => (
          <Field.Root>
            <Field.Label>{resolved.label}</Field.Label>
            <Input value={field.state.value ?? ''} onChange={(e) => field.handleChange(e.target.value)} />
          </Field.Root>
        ),
      })

      expect(TestField.displayName).toBe('TestField')
    })
  })

  describe('render props', () => {
    it('передаёт field API в render функцию', async () => {
      const renderSpy = vi.fn()

      const TestField = createField<TestFieldProps, string>({
        displayName: 'TestField',
        render: (props) => {
          renderSpy(props)
          return (
            <Field.Root>
              <Input value={props.field.state.value ?? ''} onChange={(e) => props.field.handleChange(e.target.value)} />
            </Field.Root>
          )
        },
      })

      render(
        <TestWrapper>
          <Form initialValue={{ name: 'test' }} onSubmit={vi.fn()}>
            <TestField name="name" />
          </Form>
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(renderSpy).toHaveBeenCalled()
        const props = renderSpy.mock.calls[0][0]
        expect(props.field).toBeDefined()
        expect(props.field.state).toBeDefined()
        expect(props.value).toBe('test')
      })
    })

    it('передаёт fullPath в render функцию', async () => {
      let receivedFullPath = ''

      const TestField = createField<TestFieldProps, string>({
        displayName: 'TestField',
        render: ({ field, fullPath }) => {
          receivedFullPath = fullPath
          return <Input value={field.state.value ?? ''} onChange={(e) => field.handleChange(e.target.value)} />
        },
      })

      render(
        <TestWrapper>
          <Form initialValue={{ username: '' }} onSubmit={vi.fn()}>
            <TestField name="username" />
          </Form>
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(receivedFullPath).toBe('username')
      })
    })

    it('передаёт componentProps в render функцию', async () => {
      let receivedTestProp = ''

      const TestField = createField<TestFieldProps, string>({
        displayName: 'TestField',
        render: ({ field, componentProps }) => {
          receivedTestProp = componentProps.testProp ?? ''
          return <Input value={field.state.value ?? ''} onChange={(e) => field.handleChange(e.target.value)} />
        },
      })

      render(
        <TestWrapper>
          <Form initialValue={{ name: '' }} onSubmit={vi.fn()}>
            <TestField name="name" testProp="custom-value" />
          </Form>
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(receivedTestProp).toBe('custom-value')
      })
    })
  })

  describe('resolved props', () => {
    it('резолвит label из props', async () => {
      const TestField = createField<TestFieldProps, string>({
        displayName: 'TestField',
        render: ({ field, resolved }) => (
          <Field.Root>
            <Field.Label>{resolved.label}</Field.Label>
            <Input value={field.state.value ?? ''} onChange={(e) => field.handleChange(e.target.value)} />
          </Field.Root>
        ),
      })

      render(
        <TestWrapper>
          <Form initialValue={{ name: '' }} onSubmit={vi.fn()}>
            <TestField name="name" label="Имя пользователя" />
          </Form>
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(screen.getByText('Имя пользователя')).toBeInTheDocument()
      })
    })

    it('резолвит label из schema meta', async () => {
      const Schema = z.object({
        email: z.string().meta({ ui: { title: 'Email адрес' } }),
      })

      const TestField = createField<TestFieldProps, string>({
        displayName: 'TestField',
        render: ({ field, resolved }) => (
          <Field.Root>
            <Field.Label>{resolved.label}</Field.Label>
            <Input value={field.state.value ?? ''} onChange={(e) => field.handleChange(e.target.value)} />
          </Field.Root>
        ),
      })

      render(
        <TestWrapper>
          <Form schema={Schema} initialValue={{ email: '' }} onSubmit={vi.fn()}>
            <TestField name="email" />
          </Form>
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(screen.getByText('Email адрес')).toBeInTheDocument()
      })
    })

    it('props имеют приоритет над schema meta', async () => {
      const Schema = z.object({
        email: z.string().meta({ ui: { title: 'Из схемы' } }),
      })

      const TestField = createField<TestFieldProps, string>({
        displayName: 'TestField',
        render: ({ field, resolved }) => (
          <Field.Root>
            <Field.Label>{resolved.label}</Field.Label>
            <Input value={field.state.value ?? ''} onChange={(e) => field.handleChange(e.target.value)} />
          </Field.Root>
        ),
      })

      render(
        <TestWrapper>
          <Form schema={Schema} initialValue={{ email: '' }} onSubmit={vi.fn()}>
            <TestField name="email" label="Из props" />
          </Form>
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(screen.getByText('Из props')).toBeInTheDocument()
        expect(screen.queryByText('Из схемы')).not.toBeInTheDocument()
      })
    })

    it('резолвит disabled из Form level', async () => {
      let isDisabled = false

      const TestField = createField<TestFieldProps, string>({
        displayName: 'TestField',
        render: ({ field, resolved }) => {
          isDisabled = resolved.disabled ?? false
          return (
            <Input
              disabled={resolved.disabled}
              value={field.state.value ?? ''}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          )
        },
      })

      render(
        <TestWrapper>
          <Form initialValue={{ name: '' }} onSubmit={vi.fn()} disabled>
            <TestField name="name" />
          </Form>
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(isDisabled).toBe(true)
        expect(screen.getByRole('textbox')).toBeDisabled()
      })
    })
  })

  describe('useFieldState', () => {
    it('вызывает useFieldState и передаёт результат в render', async () => {
      interface PasswordFieldProps extends BaseFieldProps {
        defaultVisible?: boolean
      }

      const TestField = createField<PasswordFieldProps, string, { visible: boolean; toggle: () => void }>({
        displayName: 'TestPasswordField',
        useFieldState: (props) => {
          const [visible, setVisible] = useState(props.defaultVisible ?? false)
          return { visible, toggle: () => setVisible((v) => !v) }
        },
        render: ({ field, fieldState }) => (
          <div>
            <Input
              type={fieldState.visible ? 'text' : 'password'}
              data-testid="password-input"
              value={field.state.value ?? ''}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <button type="button" onClick={fieldState.toggle} data-testid="toggle-btn">
              Toggle
            </button>
          </div>
        ),
      })

      render(
        <TestWrapper>
          <Form initialValue={{ password: 'secret' }} onSubmit={vi.fn()}>
            <TestField name="password" />
          </Form>
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(screen.getByTestId('password-input')).toHaveAttribute('type', 'password')
      })

      // Кликаем toggle
      await userEvent.click(screen.getByTestId('toggle-btn'))

      await waitFor(() => {
        expect(screen.getByTestId('password-input')).toHaveAttribute('type', 'text')
      })
    })

    it('useFieldState получает resolved props', async () => {
      let receivedResolved: ResolvedFieldProps | null = null

      const TestField = createField<TestFieldProps, string, object>({
        displayName: 'TestField',
        useFieldState: (_props, resolved) => {
          receivedResolved = resolved
          return {}
        },
        render: ({ field }) => (
          <Input
            value={field.state.value ?? ''}
            onChange={(e) => field.handleChange(e.target.value)}
          />
        ),
      })

      render(
        <TestWrapper>
          <Form initialValue={{ name: '' }} onSubmit={vi.fn()}>
            <TestField name="name" label="Test Label" placeholder="Test Placeholder" />
          </Form>
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(receivedResolved).not.toBeNull()
        expect(receivedResolved?.label).toBe('Test Label')
        expect(receivedResolved?.placeholder).toBe('Test Placeholder')
      })
    })
  })

  describe('error handling', () => {
    it('вычисляет hasError и errorMessage', async () => {
      const Schema = z.object({
        email: z.string().email('Неверный email'),
      })

      const TestField = createField<TestFieldProps, string>({
        displayName: 'TestField',
        render: ({ field, resolved, hasError, errorMessage }) => (
          <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage}>
            <Input
              data-testid="email-input"
              value={field.state.value ?? ''}
              onChange={(e) =>
                field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
          </FieldWrapper>
        ),
      })

      render(
        <TestWrapper>
          <Form schema={Schema} initialValue={{ email: 'invalid' }} onSubmit={vi.fn()}>
            <TestField name="email" label="Email" />
          </Form>
        </TestWrapper>,
      )

      // Вводим невалидное значение и вызываем blur для триггера валидации
      const input = await screen.findByTestId('email-input')
      await userEvent.clear(input)
      await userEvent.type(input, 'not-an-email')
      await userEvent.tab() // blur

      // Ждём появления ошибки
      await waitFor(
        () => {
          expect(screen.getByText('Неверный email')).toBeInTheDocument()
        },
        { timeout: 2000 },
      )
    })
  })
})

describe('FieldError', () => {
  it('показывает ошибку когда hasError=true', () => {
    render(
      <TestWrapper>
        <Field.Root invalid>
          <FieldError hasError={true} errorMessage="Ошибка валидации" helperText="Подсказка" />
        </Field.Root>
      </TestWrapper>,
    )

    expect(screen.getByText('Ошибка валидации')).toBeInTheDocument()
    expect(screen.queryByText('Подсказка')).not.toBeInTheDocument()
  })

  it('показывает helperText когда нет ошибки', () => {
    render(
      <TestWrapper>
        <Field.Root>
          <FieldError hasError={false} errorMessage="" helperText="Это подсказка" />
        </Field.Root>
      </TestWrapper>,
    )

    expect(screen.getByText('Это подсказка')).toBeInTheDocument()
  })

  it('не рендерит ничего когда нет ошибки и helperText', () => {
    const { container } = render(
      <TestWrapper>
        <Field.Root>
          <FieldError hasError={false} errorMessage="" helperText={undefined} />
        </Field.Root>
      </TestWrapper>,
    )

    // Field.Root должен быть пустым (кроме самого div)
    expect(container.querySelector('[data-part="root"]')?.children.length).toBe(0)
  })
})
