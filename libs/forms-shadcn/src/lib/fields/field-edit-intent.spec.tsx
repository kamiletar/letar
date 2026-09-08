import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldEditIntent } from './field-edit-intent'
import { FieldPassword } from './field-password'

type FormLike = { state: { values: Record<string, unknown> } }

describe('FieldEditIntent (shadcn)', () => {
  it('view mode: показывает displayValue и кнопку «Заменить», дочернее поле не смонтировано', () => {
    render(
      <TestForm defaultValues={{ apiKey: { isEdited: false, value: null } }}>
        <FieldEditIntent name="apiKey" displayValue="************P9x4" emptyValue="">
          <FieldPassword name="apiKey.value" />
        </FieldEditIntent>
      </TestForm>,
    )

    expect(screen.getByText('************P9x4')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Заменить' })).toBeInTheDocument()
    expect(document.querySelector('input[data-field-name="apiKey.value"]')).not.toBeInTheDocument()
  })

  it('клик «Заменить» монтирует дочернее поле и переводит в него фокус', () => {
    render(
      <TestForm defaultValues={{ apiKey: { isEdited: false, value: null } }}>
        <FieldEditIntent name="apiKey" displayValue="****" emptyValue="">
          <FieldPassword name="apiKey.value" />
        </FieldEditIntent>
      </TestForm>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Заменить' }))

    const input = document.querySelector('input[data-field-name="apiKey.value"]')
    expect(input).toBeInTheDocument()
    expect(input).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Оставить текущее' })).toBeInTheDocument()
  })

  it('клик «Оставить текущее» размонтирует дочернее поле, возвращает view mode и фокус на триггер', () => {
    render(
      <TestForm defaultValues={{ apiKey: { isEdited: true, value: 'sk_live_x' } }}>
        <FieldEditIntent name="apiKey" displayValue="****" emptyValue="">
          <FieldPassword name="apiKey.value" />
        </FieldEditIntent>
      </TestForm>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Оставить текущее' }))

    const trigger = screen.getByRole('button', { name: 'Заменить' })
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(document.querySelector('input[data-field-name="apiKey.value"]')).not.toBeInTheDocument()
  })

  it('create mode: initialValue isEdited: true стартует сразу в edit mode', () => {
    render(
      <TestForm defaultValues={{ apiKey: { isEdited: true, value: '' } }}>
        <FieldEditIntent name="apiKey" displayValue="****" emptyValue="">
          <FieldPassword name="apiKey.value" />
        </FieldEditIntent>
      </TestForm>,
    )

    expect(document.querySelector('input[data-field-name="apiKey.value"]')).toBeInTheDocument()
    expect(screen.queryByText('****')).not.toBeInTheDocument()
  })

  it('поддерживает кастомные editLabel/cancelLabel', () => {
    render(
      <TestForm defaultValues={{ apiKey: { isEdited: false, value: null } }}>
        <FieldEditIntent name="apiKey" displayValue="****" editLabel="Обновить ключ" emptyValue="">
          <FieldPassword name="apiKey.value" />
        </FieldEditIntent>
      </TestForm>,
    )

    expect(screen.getByRole('button', { name: 'Обновить ключ' })).toBeInTheDocument()
  })

  describe('итоговый контракт значения (эквивалент submit)', () => {
    it('при isEdited: false итоговое значение — {isEdited: false, value: null}', () => {
      let form: FormLike | undefined
      render(
        <TestForm
          defaultValues={{ apiKey: { isEdited: false, value: null } }}
          onFormReady={(f) => {
            form = f as unknown as FormLike
          }}
        >
          <FieldEditIntent name="apiKey" displayValue="****" emptyValue="">
            <FieldPassword name="apiKey.value" />
          </FieldEditIntent>
        </TestForm>,
      )

      expect(form?.state.values.apiKey).toEqual({ isEdited: false, value: null })
    })

    it('после ввода нового значения итоговое значение — {isEdited: true, value: "..."}', () => {
      let form: FormLike | undefined
      render(
        <TestForm
          defaultValues={{ apiKey: { isEdited: false, value: null } }}
          onFormReady={(f) => {
            form = f as unknown as FormLike
          }}
        >
          <FieldEditIntent name="apiKey" displayValue="****" emptyValue="">
            <FieldPassword name="apiKey.value" />
          </FieldEditIntent>
        </TestForm>,
      )

      fireEvent.click(screen.getByRole('button', { name: 'Заменить' }))
      const input = document.querySelector('input[data-field-name="apiKey.value"]') as HTMLInputElement
      fireEvent.change(input, { target: { value: 'sk_live_new_secret' } })

      expect(form?.state.values.apiKey).toEqual({ isEdited: true, value: 'sk_live_new_secret' })
    })
  })
})
