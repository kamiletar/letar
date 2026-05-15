import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { z } from 'zod/v4'

import { Form } from '../../declarative'
import { fillField } from '../fill-field'
import { renderForm } from '../render-form'

const TestSchema = z.object({
  name: z
    .string()
    .meta({ ui: { title: 'Имя', placeholder: 'Введите имя' } }),
  age: z
    .number()
    .meta({ ui: { title: 'Возраст' } }),
})

function TextForm() {
  return (
    <Form
      schema={TestSchema}
      initialValue={{ name: '', age: 0 }}
      onSubmit={() => {}}
    >
      <Form.Field.String name="name" />
      <Form.Field.Number name="age" />
      <Form.Button.Submit>Сохранить</Form.Button.Submit>
    </Form>
  )
}

describe('fillField', () => {
  it('заполняет текстовое поле по data-field-name', async () => {
    renderForm(TextForm)

    await fillField('name', 'Иван')

    const input = document.querySelector<HTMLInputElement>('[data-field-name="name"]')
    expect(input?.value).toBe('Иван')
  })

  it('выбрасывает ошибку если поле не найдено', async () => {
    renderForm(TextForm)

    await expect(fillField('nonexistent', 'test')).rejects.toThrow(
      'fillField: поле "nonexistent" не найдено',
    )
  })

  it('очищает поле перед заполнением', async () => {
    renderForm(TextForm)

    await fillField('name', 'Первое')
    await fillField('name', 'Второе')

    const input = document.querySelector<HTMLInputElement>('[data-field-name="name"]')
    expect(input?.value).toBe('Второе')
  })
})
