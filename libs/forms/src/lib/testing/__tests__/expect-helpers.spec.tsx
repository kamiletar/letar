import { describe, expect, it } from 'vitest'
import { z } from 'zod/v4'

import { Form } from '../../declarative'
import { expectFieldValue, expectNoFieldError } from '../expect-helpers'
import { renderForm } from '../render-form'

const TestSchema = z.object({
  name: z
    .string()
    .min(2, 'Минимум 2 символа')
    .meta({ ui: { title: 'Имя' } }),
})

function TestForm() {
  return (
    <Form
      schema={TestSchema}
      initialValue={{ name: 'Иван' }}
      onSubmit={() => {}}
    >
      <Form.Field.String name="name" />
      <Form.Button.Submit>OK</Form.Button.Submit>
    </Form>
  )
}

describe('expect-helpers', () => {
  describe('expectFieldValue', () => {
    it('проверяет значение текстового поля', () => {
      renderForm(TestForm)
      expectFieldValue('name', 'Иван')
    })

    it('выбрасывает ошибку при несовпадении', () => {
      renderForm(TestForm)
      expect(() => expectFieldValue('name', 'Пётр')).toThrow('ожидалось "Пётр"')
    })

    it('выбрасывает ошибку если поле не найдено', () => {
      renderForm(TestForm)
      expect(() => expectFieldValue('missing', 'test')).toThrow('не найдено')
    })
  })

  describe('expectNoFieldError', () => {
    it('не выбрасывает ошибку если поле валидно', () => {
      renderForm(TestForm)
      // Начальное значение 'Иван' — валидное (min 2)
      expect(() => expectNoFieldError('name')).not.toThrow()
    })
  })
})
