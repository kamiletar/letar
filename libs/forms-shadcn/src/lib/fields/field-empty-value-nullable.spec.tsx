import { useDeclarativeForm } from '@letar/forms-react'
import { TestForm } from '@letar/forms-react/testing'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { z } from 'zod/v4'
import { FieldCombobox } from './field-combobox'
import { FieldSelect } from './field-select'

// Вопрос 50 (§14): очистка Select/Combobox пишет `null` для nullable-схемы, иначе `''` (у числового Select — `0`)

beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn(() => false)
  Element.prototype.setPointerCapture = vi.fn()
  Element.prototype.releasePointerCapture = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- инстанс TanStack Form не выводится из TData
type AnyForm = any

const schema = z.object({
  plain: z.string().optional(),
  nullableField: z.string().nullable(),
  numberNullable: z.number().nullable(),
  numberPlain: z.number().optional(),
  parent: z.string(),
  child: z.string().nullable(),
  childPlain: z.string().optional(),
})

const options = [
  { label: 'Альфа', value: 'A' },
  { label: 'Бета', value: 'B' },
]

const numberOptions = [
  { label: 'Один', value: 1 },
  { label: 'Два', value: 2 },
]

/** Живое поле формы: form-level листенер TanStack зовётся только у смонтированного `form.Field` */
function Mount({ names }: { names: string[] }) {
  const { form } = useDeclarativeForm()
  return <>{names.map((name) => <form.Field key={name} name={name}>{() => null}</form.Field>)}</>
}

function setup(defaults: Record<string, unknown>, ui: React.ReactElement, withSchema = true) {
  let form!: AnyForm
  const utils = render(
    <TestForm defaultValues={defaults} schema={withSchema ? schema : undefined} onFormReady={(f) => (form = f)}>
      {ui}
    </TestForm>,
  )
  return { form: () => form, ...utils }
}

const clearButton = () => document.querySelector<HTMLElement>('[data-slot="select-clear"]')!

describe('FieldSelect (shadcn) — пустое значение при очистке', () => {
  it('nullable-схема: собственная очистка пишет null', () => {
    const { form } = setup({ nullableField: 'A' }, <FieldSelect name="nullableField" options={options} />)
    // Настоящая кнопка рядом с триггером, а не `span role=button` внутри него
    expect(clearButton().tagName).toBe('BUTTON')
    expect(clearButton().closest('[data-slot="select-trigger"]')).toBeNull()
    fireEvent.click(clearButton())
    expect(form().state.values.nullableField).toBeNull()
  })

  it('не nullable-схема: пустая строка, как раньше', () => {
    const { form } = setup({ plain: 'A' }, <FieldSelect name="plain" options={options} />)
    fireEvent.click(clearButton())
    expect(form().state.values.plain).toBe('')
  })

  it('числовой Select: nullable — null, не nullable — 0', () => {
    const first = setup(
      { numberNullable: 1 },
      <FieldSelect name="numberNullable" valueType="number" options={numberOptions} />,
    )
    fireEvent.click(clearButton())
    expect(first.form().state.values.numberNullable).toBeNull()
    first.unmount()

    const second = setup(
      { numberPlain: 1 },
      <FieldSelect name="numberPlain" valueType="number" options={numberOptions} />,
    )
    fireEvent.click(clearButton())
    expect(second.form().state.values.numberPlain).toBe(0)
  })

  it('без schema у формы: пустая строка', () => {
    const { form } = setup({ nullableField: 'A' }, <FieldSelect name="nullableField" options={options} />, false)
    fireEvent.click(clearButton())
    expect(form().state.values.nullableField).toBe('')
  })

  it('автоочистка зависимого nullable-поля пишет null, не nullable — пустую строку', () => {
    const { form } = setup(
      { parent: 'A', child: 'x', childPlain: 'y' },
      <>
        <Mount names={['parent']} />
        <FieldSelect name="child" dependsOn="parent" options={() => [{ label: 'Икс', value: 'x' }]} />
        <FieldSelect name="childPlain" dependsOn="parent" options={() => [{ label: 'Игрек', value: 'y' }]} />
      </>,
    )
    act(() => form().setFieldValue('parent', 'B'))
    expect(form().state.values.child).toBeNull()
    expect(form().state.values.childPlain).toBe('')
  })
})

describe('FieldCombobox (shadcn) — пустое значение и подпись', () => {
  it('автоочистка зависимого nullable-поля пишет null', () => {
    const { form } = setup(
      { parent: 'A', child: 'x' },
      <>
        <Mount names={['parent']} />
        <FieldCombobox name="child" dependsOn="parent" options={[{ label: 'Икс', value: 'x' }]} />
      </>,
    )
    act(() => form().setFieldValue('parent', 'B'))
    expect(form().state.values.child).toBeNull()
  })

  it('внешняя смена значения (setFieldValue, восстановление черновика) обновляет подпись в поле ввода', async () => {
    const list = [{ label: 'Москва', value: 'msk' }, { label: 'Казань', value: 'kzn' }]
    const { form } = setup({ plain: 'msk' }, <FieldCombobox name="plain" options={list} />)
    const input = () => screen.getByRole('combobox') as HTMLInputElement
    await waitFor(() => expect(input().value).toBe('Москва'))

    act(() => form().setFieldValue('plain', 'kzn'))

    await waitFor(() => expect(input().value).toBe('Казань'))
  })

  it('выбор пользователем подпись не перебивает', async () => {
    const list = [{ label: 'Москва', value: 'msk' }, { label: 'Казань', value: 'kzn' }]
    const { form } = setup({ plain: 'msk' }, <FieldCombobox name="plain" options={list} />)
    const input = () => screen.getByRole('combobox') as HTMLInputElement
    await waitFor(() => expect(input().value).toBe('Москва'))

    fireEvent.focus(input())
    fireEvent.click(await screen.findByRole('option', { name: 'Казань' }))

    expect(form().state.values.plain).toBe('kzn')
    await waitFor(() => expect(input().value).toBe('Казань'))
  })
})
