'use client'

import { Form } from '@letar/forms'

const KIND_OPTIONS = [
  { value: 'a', label: 'Первый' },
  { value: 'b', label: 'Второй' },
]

export function DemoFields() {
  return (
    <>
      <Form.Field.String name="title" label="Название" />
      <Form.Field.Number name="rating" label="Оценка" />
      <Form.Field.Select name="kind" label="Тип" options={KIND_OPTIONS} />
      <Form.Button.Submit>Сохранить</Form.Button.Submit>
    </>
  )
}
