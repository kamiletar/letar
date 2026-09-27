import { TestForm } from '@letar/forms-react/testing'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { z } from 'zod/v4'
import { FieldCombobox } from './field-combobox'
import { FieldSelect } from './field-select'

// Находки живой проверки shadcn-скина в браузере (form-develop-app-shadcn, /select-live-demo, 2026-09-27):
// то, что jsdom-спеки пропускали, а настоящие события показали.
// ⚠️ Два теста Select (значение при оптимистичном create, подсказка после очистки) — поведенческие: jsdom не
// воспроизводит ни `onValueChange('')` от нативного <select> Radix, ни его переход в неконтролируемый режим;
// ловит их только живой прогон (`/select-live-demo`)

beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn(() => false)
  Element.prototype.setPointerCapture = vi.fn()
  Element.prototype.releasePointerCapture = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

const options = [
  { label: 'React', value: 'react' },
  { label: 'Vue', value: 'vue' },
]

const schema = z.object({ framework: z.string().nullable() })

type Created = { label: string; value: string } | null

const deferred = <T,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

function setup(ui: React.ReactElement, initial: string | null) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- инстанс TanStack Form
  let form: any
  render(
    <TestForm defaultValues={{ framework: initial }} schema={schema} onFormReady={(f) => (form = f)}>
      {ui}
    </TestForm>,
  )
  return { value: () => form.state.values.framework as string | null }
}

describe('FieldSelect (shadcn) — живая проверка', () => {
  it('оптимистичный create при уже выбранном значении: подпись новой записи, значение формы прежнее', async () => {
    const server = deferred<Created>()
    const { value } = setup(
      <FieldSelect
        name="framework"
        options={options}
        onCreate={async (_search, ctx) => {
          ctx.optimistic({ label: 'Solid' })
          return server.promise
        }}
      />,
      'react',
    )
    expect(screen.getByRole('combobox')).toHaveTextContent('React')

    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' })
    await userEvent.click(await screen.findByRole('option', { name: /Добавить/ }))

    // Radix сам зовёт onValueChange(''), пока его нативный <select> не нашёл опцию значения: форма не должна терять 'react'
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('Solid'))
    expect(value()).toBe('react')

    await act(async () => server.resolve({ label: 'Solid', value: 'solid' }))
    await waitFor(() => expect(value()).toBe('solid'))
    expect(screen.getByRole('combobox')).toHaveTextContent('Solid')
  })

  it('«Очистить» у nullable: форма null, триггер снова показывает подсказку, а не прежнее значение', async () => {
    const { value } = setup(<FieldSelect name="framework" options={options} placeholder="Выберите" />, 'react')
    expect(screen.getByRole('combobox')).toHaveTextContent('React')

    await userEvent.click(screen.getByRole('button', { name: 'Очистить' }))

    expect(value()).toBeNull()
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('Выберите'))
    expect(screen.getByRole('combobox')).not.toHaveTextContent('React')
  })
})

describe('FieldCombobox (shadcn) — живая проверка', () => {
  const input = () => screen.getByRole('combobox') as HTMLInputElement

  it('«Очистить»: nullable пишет null, поле ввода пустое, список не открывается', async () => {
    const { value } = setup(<FieldCombobox name="framework" options={options} />, 'react')
    await waitFor(() => expect(input().value).toBe('React'))
    fireEvent.keyDown(input(), { key: 'Escape' })

    await userEvent.click(screen.getByRole('button', { name: 'Очистить' }))

    expect(value()).toBeNull()
    expect(input().value).toBe('')
    expect(input()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('button', { name: 'Очистить' })).not.toBeInTheDocument()
  })

  it('без значения кнопки очистки нет', () => {
    setup(<FieldCombobox name="framework" options={options} />, null)
    expect(screen.queryByRole('button', { name: 'Очистить' })).not.toBeInTheDocument()
  })

  it('clearable={false} прячет кнопку очистки при выбранном значении', async () => {
    setup(<FieldCombobox name="framework" options={options} clearable={false} />, 'react')
    await waitFor(() => expect(input().value).toBe('React'))
    expect(screen.queryByRole('button', { name: 'Очистить' })).not.toBeInTheDocument()
  })

  it('стёрли текст руками и закрыли список — в поле снова подпись выбранного, значение не потеряно', async () => {
    const { value } = setup(<FieldCombobox name="framework" options={options} />, 'react')
    await waitFor(() => expect(input().value).toBe('React'))

    fireEvent.change(input(), { target: { value: '' } })
    expect(input().value).toBe('')
    fireEvent.keyDown(input(), { key: 'Escape' })

    await waitFor(() => expect(input().value).toBe('React'))
    expect(value()).toBe('react')
  })

  it('значения нет, набрали «Vu» и закрыли список — недонабранный текст стирается', async () => {
    const { value } = setup(<FieldCombobox name="framework" options={options} />, null)
    fireEvent.focus(input())
    fireEvent.change(input(), { target: { value: 'Vu' } })
    expect(input().value).toBe('Vu')

    fireEvent.keyDown(input(), { key: 'Escape' })

    await waitFor(() => expect(input().value).toBe(''))
    expect(value()).toBeNull()
  })

  it('оптимистичный create без значения: текст поиска не стирается закрытием списка', async () => {
    const server = deferred<Created>()
    setup(
      <FieldCombobox
        name="framework"
        options={options}
        onCreate={async (_search, ctx) => {
          ctx.optimistic({ label: 'Solid' })
          return server.promise
        }}
      />,
      null,
    )
    fireEvent.focus(input())
    fireEvent.change(input(), { target: { value: 'Sol' } })
    fireEvent.click(await screen.findByRole('option', { name: /Добавить/ }))

    await waitFor(() => expect(input().value).toBe('Solid'))
    await act(async () => server.resolve({ label: 'Solid', value: 'solid' }))
    await waitFor(() => expect(input().value).toBe('Solid'))
  })

  it('выбор пункта не откатывается подписью прежнего значения', async () => {
    const { value } = setup(<FieldCombobox name="framework" options={options} />, 'react')
    await waitFor(() => expect(input().value).toBe('React'))

    fireEvent.focus(input())
    fireEvent.click(await screen.findByRole('option', { name: 'Vue' }))

    expect(value()).toBe('vue')
    await waitFor(() => expect(input().value).toBe('Vue'))
  })

  it('F2 при открытом списке без подсвеченного пункта правит выбранное значение', async () => {
    const onUpdate = vi.fn().mockResolvedValue({ label: 'React 19', value: 'react' })
    setup(<FieldCombobox name="framework" options={options} onUpdate={onUpdate} />, 'react')
    await waitFor(() => expect(input().value).toBe('React'))

    fireEvent.focus(input())
    expect(input()).toHaveAttribute('aria-expanded', 'true')
    fireEvent.keyDown(input(), { key: 'F2' })

    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1))
    expect(onUpdate.mock.calls[0]![0]).toMatchObject({ value: 'react' })
  })

  it('клик по самому полю ввода не закрывает открытый список', async () => {
    setup(<FieldCombobox name="framework" options={options} />, null)
    fireEvent.focus(input())
    expect(input()).toHaveAttribute('aria-expanded', 'true')

    await userEvent.click(input())

    expect(input()).toHaveAttribute('aria-expanded', 'true')
  })
})

describe('Зависимое поле — подпись родителя в подсказке', () => {
  const depSchema = z.object({ country: z.string().nullable(), town: z.string().nullable() })

  function setupDependent(parent: React.ReactElement) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- инстанс TanStack Form
    let form: any
    render(
      <TestForm
        defaultValues={{ country: null, town: null }}
        schema={depSchema}
        onFormReady={(f) => (form = f)}
      >
        {parent}
        <FieldSelect name="town" dependsOn="country" options={[{ label: 'Москва', value: 'msk' }]} />
      </TestForm>,
    )
    return { form: () => form }
  }

  const hint = () => document.querySelector<HTMLElement>('[data-slot="dependent-hint"]')

  it('подсказка называет родителя его видимой подписью, а не именем поля', async () => {
    setupDependent(<FieldSelect name="country" label="Страна" options={[{ label: 'Россия', value: 'ru' }]} />)
    await waitFor(() => expect(hint()).toHaveTextContent('Сначала выберите «Страна»'))
  })

  it('родитель после зависимого поля в дереве — подпись подхватывается после монтирования', async () => {
    render(
      <TestForm defaultValues={{ country: null, town: null }} schema={depSchema}>
        <FieldSelect name="town" dependsOn="country" options={[]} />
        <FieldCombobox name="country" label="Страна проживания" options={[{ label: 'Россия', value: 'ru' }]} />
      </TestForm>,
    )
    await waitFor(() => expect(hint()).toHaveTextContent('Сначала выберите «Страна проживания»'))
  })

  it('без подписи у родителя остаётся имя поля', async () => {
    setupDependent(<FieldSelect name="country" options={[{ label: 'Россия', value: 'ru' }]} />)
    await waitFor(() => expect(hint()).toHaveTextContent('Сначала выберите «country»'))
  })

  it('очистка объявляется с подписью родителя', async () => {
    const { form } = setupDependent(
      <FieldSelect name="country" label="Страна" options={[{ label: 'Россия', value: 'ru' }]} />,
    )
    await waitFor(() => expect(hint()).toHaveTextContent('«Страна»'))
    await act(async () => {
      form().setFieldValue('country', 'ru')
    })
    await act(async () => {
      form().setFieldValue('town', 'msk')
    })
    await act(async () => {
      form().setFieldValue('country', null)
    })
    await waitFor(() =>
      expect(document.querySelector('[data-dependent-live]')).toHaveTextContent('изменилось поле «Страна»')
    )
  })
})
