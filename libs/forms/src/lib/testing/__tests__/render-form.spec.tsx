import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod/v4'

import { Form } from '../../declarative'
import { renderForm } from '../render-form'

// Простая тестовая форма
const TestSchema = z.object({
  name: z
    .string()
    .min(2, 'Минимум 2 символа')
    .meta({ ui: { title: 'Имя' } }),
  email: z
    .string()
    .email('Некорректный email')
    .meta({ ui: { title: 'Email' } }),
})

function SimpleForm({ onSubmit }: { onSubmit?: (data: { value: unknown }) => void }) {
  return (
    <Form
      schema={TestSchema}
      initialValue={{ name: '', email: '' }}
      onSubmit={onSubmit ? (data) => onSubmit(data) : undefined}
    >
      <Form.Field.String name="name" />
      <Form.Field.String name="email" />
      <Form.Button.Submit>Отправить</Form.Button.Submit>
    </Form>
  )
}

describe('renderForm', () => {
  it('рендерит компонент формы в ChakraProvider', () => {
    const { getByText } = renderForm(SimpleForm)
    expect(getByText('Отправить')).toBeInTheDocument()
  })

  it('создаёт onSubmit мок автоматически', () => {
    const { onSubmit } = renderForm(SimpleForm)
    expect(onSubmit).toBeDefined()
    expect(typeof onSubmit).toBe('function')
  })

  it('принимает кастомный onSubmit', () => {
    const customSubmit = vi.fn()
    const { onSubmit } = renderForm(SimpleForm, { onSubmit: customSubmit })
    expect(onSubmit).toBe(customSubmit)
  })

  it('возвращает хелперы fillField и submitForm', () => {
    const result = renderForm(SimpleForm)
    expect(typeof result.fillField).toBe('function')
    expect(typeof result.submitForm).toBe('function')
    expect(typeof result.expectFieldError).toBe('function')
    expect(typeof result.expectNoFieldError).toBe('function')
  })

  it('рендерит поля формы', () => {
    const { getByText } = renderForm(SimpleForm)
    expect(getByText('Имя')).toBeInTheDocument()
    expect(getByText('Email')).toBeInTheDocument()
  })
})
