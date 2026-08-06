import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Form } from './'
import { FormWatch } from './form-watch'

// Обёртка для тестов с Chakra UI
const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('onFieldChange prop', () => {
  it('вызывает callback при изменении отслеживаемого поля', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <TestWrapper>
        <Form
          initialValue={{ name: '', slug: '' }}
          onSubmit={vi.fn()}
          onFieldChange={{
            name: onChange,
          }}
        >
          <Form.Field.String name="name" label="Name" />
          <Form.Field.String name="slug" label="Slug" />
        </Form>
      </TestWrapper>,
    )

    const nameInput = screen.getByLabelText('Name')
    await user.type(nameInput, 'a')

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled()
      // Проверяем что callback получил значение и api
      const [value, api] = onChange.mock.calls[onChange.mock.calls.length - 1]
      expect(value).toBe('a')
      expect(api).toHaveProperty('setFieldValue')
      expect(api).toHaveProperty('getFieldValue')
      expect(api).toHaveProperty('getValues')
    })
  })

  it('не вызывает callback для неотслеживаемых полей', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <TestWrapper>
        <Form
          initialValue={{ name: '', other: '' }}
          onSubmit={vi.fn()}
          onFieldChange={{
            name: onChange,
          }}
        >
          <Form.Field.String name="name" label="Name" />
          <Form.Field.String name="other" label="Other" />
        </Form>
      </TestWrapper>,
    )

    const otherInput = screen.getByLabelText('Other')
    await user.type(otherInput, 'hello')

    // Небольшая пауза для проверки что callback НЕ вызван
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(onChange).not.toHaveBeenCalled()
  })

  it('FieldChangeApi.setFieldValue работает', async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <Form
          initialValue={{ name: '', slug: '' }}
          onSubmit={vi.fn()}
          onFieldChange={{
            name: (value, { setFieldValue }) => {
              setFieldValue('slug', String(value).toLowerCase().replace(/\s+/g, '-'))
            },
          }}
        >
          <Form.Field.String name="name" label="Name" />
          <Form.Field.String name="slug" label="Slug" />
        </Form>
      </TestWrapper>,
    )

    const nameInput = screen.getByLabelText('Name')
    await user.type(nameInput, 'Hello World')

    await waitFor(() => {
      const slugInput = screen.getByLabelText('Slug') as HTMLInputElement
      expect(slugInput.value).toBe('hello-world')
    })
  })
})

describe('Form.Watch', () => {
  it('вызывает onChange при изменении отслеживаемого поля', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <TestWrapper>
        <Form initialValue={{ city: '' }} onSubmit={vi.fn()}>
          <Form.Field.String name="city" label="City" />
          <FormWatch field="city" onChange={onChange} />
        </Form>
      </TestWrapper>,
    )

    const input = screen.getByLabelText('City')
    await user.type(input, 'M')

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled()
      const [value, api] = onChange.mock.calls[onChange.mock.calls.length - 1]
      expect(value).toBe('M')
      expect(api).toHaveProperty('setFieldValue')
    })
  })

  it('не рендерит DOM элементы', () => {
    const { container } = render(
      <TestWrapper>
        <Form initialValue={{ x: '' }} onSubmit={vi.fn()}>
          <FormWatch field="x" onChange={vi.fn()} />
        </Form>
      </TestWrapper>,
    )

    // FormWatch renderless — только form внутри
    const form = container.querySelector('form')
    expect(form).toBeTruthy()
    // Внутри form не должно быть дополнительных элементов от Watch
    expect(form?.children.length).toBe(0)
  })

  it('не вызывает onChange на первый рендер', async () => {
    const onChange = vi.fn()

    render(
      <TestWrapper>
        <Form initialValue={{ name: 'initial' }} onSubmit={vi.fn()}>
          <FormWatch field="name" onChange={onChange} />
        </Form>
      </TestWrapper>,
    )

    // Даём время на монтирование
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(onChange).not.toHaveBeenCalled()
  })

  it('setFieldValue из Watch работает', async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <Form initialValue={{ country: 'RU', currency: 'RUB' }} onSubmit={vi.fn()}>
          <Form.Field.String name="country" label="Country" />
          <Form.Field.String name="currency" label="Currency" />
          <FormWatch
            field="country"
            onChange={(value, { setFieldValue }) => {
              const map: Record<string, string> = { RU: 'RUB', US: 'USD' }
              setFieldValue('currency', map[String(value)] ?? '')
            }}
          />
        </Form>
      </TestWrapper>,
    )

    const countryInput = screen.getByLabelText('Country') as HTMLInputElement

    // Очищаем и вводим новое значение
    await user.clear(countryInput)
    await user.type(countryInput, 'US')

    await waitFor(() => {
      const currencyInput = screen.getByLabelText('Currency') as HTMLInputElement
      expect(currencyInput.value).toBe('USD')
    })
  })
})
