import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FieldCombobox } from './field-combobox'

interface Category {
  id: string
  name: string
}

const categories: Category[] = [
  { id: 'a', name: 'Кровля' },
  { id: 'b', name: 'Фасад' },
]

function setup(props: Record<string, unknown>, initial = '') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- инстанс TanStack Form
  let form: any
  render(
    <TestForm defaultValues={{ cat: initial }} onFormReady={(f) => (form = f)}>
      <FieldCombobox
        name="cat"
        debounce={10}
        getLabel={(c: Category) => c.name}
        getValue={(c: Category) => c.id}
        {...props}
      />
    </TestForm>,
  )
  return { values: () => form.state.values as { cat: string } }
}

const input = () => screen.getByRole('combobox') as HTMLInputElement
const type = (text: string) => fireEvent.change(input(), { target: { value: text } })
const spinner = () => document.querySelector('.animate-spin')

describe('FieldCombobox (shadcn) — loadOptions', () => {
  it('L1: ниже minChars вызовов нет; быстрый ввод — один вызов с последней строкой', async () => {
    const loadOptions = vi.fn(async () => categories)
    setup({ loadOptions, minChars: 2 })
    type('к')
    await new Promise((resolve) => setTimeout(resolve, 60))
    expect(loadOptions).not.toHaveBeenCalled()
    type('кр')
    type('кров')
    await waitFor(() => expect(loadOptions).toHaveBeenCalledTimes(1))
    expect(loadOptions).toHaveBeenCalledWith('кров', expect.objectContaining({ signal: expect.any(AbortSignal) }))
  })

  it('L1: список не открывали — загрузчик не зовётся; открытие с minChars 0 — вызов с пустой строкой', async () => {
    const loadOptions = vi.fn(async () => categories)
    setup({ loadOptions, minChars: 0 })
    await new Promise((resolve) => setTimeout(resolve, 60))
    expect(loadOptions).not.toHaveBeenCalled()
    fireEvent.focus(input())
    await waitFor(() => expect(loadOptions).toHaveBeenCalledWith('', expect.anything()))
    await waitFor(() => expect(screen.getByRole('option', { name: 'Кровля' })).toBeInTheDocument())
  })

  it('выбор опции: значение в форме, подпись в поле ввода', async () => {
    const loadOptions = vi.fn(async () => categories)
    const { values } = setup({ loadOptions })
    type('к')
    fireEvent.click(await screen.findByRole('option', { name: 'Фасад' }))
    expect(values().cat).toBe('b')
    expect(input().value).toBe('Фасад')
  })

  it('L4: первая загрузка — «Загрузка...»; прошлая выдача остаётся со спиннером, пока идёт новый запрос', async () => {
    let release!: (value: Category[]) => void
    const loadOptions = vi.fn((search: string) =>
      search === 'к'
        ? Promise.resolve(categories)
        : new Promise<Category[]>((resolve) => {
          release = resolve
        })
    )
    setup({ loadOptions })
    type('к')
    await screen.findByRole('option', { name: 'Кровля' })
    type('кр')
    await waitFor(() => expect(spinner()).not.toBeNull())
    expect(screen.getByRole('option', { name: 'Кровля' })).toBeInTheDocument()
    release([categories[0]!])
    await waitFor(() => expect(spinner()).toBeNull())
  })

  it('L5: ошибка — «Не удалось загрузить» и «Повторить»; повтор зовёт загрузчик с той же строкой; onLoadError один раз', async () => {
    const onLoadError = vi.fn()
    let fail = true
    const loadOptions = vi.fn(async () => {
      if (fail) {
        throw new Error('сеть')
      }
      return categories
    })
    setup({ loadOptions, onLoadError })
    type('к')
    await waitFor(() => expect(screen.getByText(/Не удалось загрузить/)).toBeInTheDocument())
    expect(screen.queryByRole('option')).toBeNull()
    expect(onLoadError).toHaveBeenCalledTimes(1)

    fail = false
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }))
    await screen.findByRole('option', { name: 'Кровля' })
    expect(loadOptions).toHaveBeenLastCalledWith('к', expect.anything())
    expect(screen.queryByText(/Не удалось загрузить/)).toBeNull()
    expect(onLoadError).toHaveBeenCalledTimes(1)
  })

  it('L6: после подтверждённого onCreate текущий поиск запрошен заново', async () => {
    const loadOptions = vi.fn(async () => categories)
    const onCreate = vi.fn().mockResolvedValue({ label: 'Новая', value: 'n' })
    const { values } = setup({ loadOptions, onCreate })
    type('Zzz')
    await waitFor(() => expect(loadOptions).toHaveBeenCalledTimes(1))
    fireEvent.click(await screen.findByRole('option', { name: '+ Добавить "Zzz"' }))
    await waitFor(() => expect(onCreate).toHaveBeenCalledWith('Zzz', expect.anything()))
    await waitFor(() => expect(values().cat).toBe('n'))
    await waitFor(() => expect(loadOptions.mock.calls.length).toBeGreaterThanOrEqual(2))
  })

  it('L7: значения нет в выдаче — подпись из loadSelected; повторный рендер не зовёт его снова', async () => {
    const loadSelected = vi.fn(async (value: string) => ({ id: value, name: 'Из loadSelected' }))
    setup({ loadOptions: async () => categories, loadSelected }, 'zzz')
    await waitFor(() => expect(input().value).toBe('Из loadSelected'))
    fireEvent.focus(input())
    fireEvent.blur(input())
    expect(loadSelected).toHaveBeenCalledTimes(1)
  })

  it('L7: initialLabel сильнее — loadSelected не зовётся', async () => {
    const loadSelected = vi.fn(async (value: string) => ({ id: value, name: 'Из loadSelected' }))
    setup({ loadOptions: async () => categories, loadSelected, initialLabel: 'Из пропа' }, 'zzz')
    await waitFor(() => expect(input().value).toBe('Из пропа'))
    expect(loadSelected).not.toHaveBeenCalled()
  })

  it('L7: запись из loadSelected — data для onUpdate (карандаш у значения)', async () => {
    const onUpdate = vi.fn().mockResolvedValue(null)
    const loadSelected = vi.fn(async (value: string) => ({ id: value, name: 'Запись' }))
    setup({ loadOptions: async () => categories, loadSelected, onUpdate }, 'zzz')
    await waitFor(() => expect(input().value).toBe('Запись'))
    fireEvent.click(await screen.findByRole('button', { name: /Изменить/ }))
    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'zzz', data: { id: 'zzz', name: 'Запись' } }),
        expect.anything(),
      )
    )
  })
})

describe('FieldCombobox (shadcn) — статичные options: loading', () => {
  it('loading + пустые options — спиннер в поле и «Загрузка...» в списке', async () => {
    setup({ options: [], loading: true, getLabel: undefined, getValue: undefined })
    expect(spinner()).not.toBeNull()
    fireEvent.focus(input())
    await waitFor(() => expect(screen.getByText('Загрузка...')).toBeInTheDocument())
  })
})
