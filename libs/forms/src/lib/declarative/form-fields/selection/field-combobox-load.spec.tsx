import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { Form } from '../../'
import { resetComboboxSourceWarning } from './field-combobox'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

interface Category {
  id: string
  name: string
}

const categories: Category[] = [
  { id: 'a', name: 'Кровля' },
  { id: 'b', name: 'Фасад' },
]

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  Element.prototype.scrollTo = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  resetComboboxSourceWarning()
  vi.restoreAllMocks()
})

function renderCombobox(props: Record<string, unknown>, initial = '') {
  return render(
    <TestWrapper>
      <Form initialValue={{ cat: initial }} onSubmit={vi.fn()}>
        <Form.Field.Combobox<string, Category>
          name="cat"
          debounce={10}
          getLabel={(c) => c.name}
          getValue={(c) => c.id}
          {...props}
        />
      </Form>
    </TestWrapper>,
  )
}

const input = () => screen.getByRole('combobox') as HTMLInputElement
const type = (text: string) => fireEvent.change(input(), { target: { value: text } })
const spinner = () => document.querySelector('.chakra-spinner')

describe('Field.Combobox — loadOptions (L1–L7)', () => {
  it('L1: быстрый ввод — один вызов с последней строкой; ниже minChars вызовов нет', async () => {
    const loadOptions = vi.fn(async () => categories)
    renderCombobox({ loadOptions, minChars: 2 })
    await userEvent.click(input())
    type('к')
    await new Promise((resolve) => setTimeout(resolve, 60))
    expect(loadOptions).not.toHaveBeenCalled()
    type('кр')
    type('кров')
    await waitFor(() => expect(loadOptions).toHaveBeenCalledTimes(1))
    expect(loadOptions).toHaveBeenCalledWith('кров', expect.objectContaining({ signal: expect.any(AbortSignal) }))
  })

  it('L1: minChars 0 — вызов с пустой строкой при открытии, не раньше', async () => {
    const loadOptions = vi.fn(async () => categories)
    renderCombobox({ loadOptions, minChars: 0 })
    await new Promise((resolve) => setTimeout(resolve, 60))
    expect(loadOptions).not.toHaveBeenCalled()
    await userEvent.click(input())
    await waitFor(() => expect(loadOptions).toHaveBeenCalledWith('', expect.anything()))
    await waitFor(() => expect(screen.getByRole('option', { name: /Кровля/ })).toBeInTheDocument())
  })

  it('L4: первая загрузка — «Loading...»; прошлые результаты остаются со спиннером, пока идёт новый запрос', async () => {
    let release!: (value: Category[]) => void
    const loadOptions = vi.fn((search: string) =>
      search === 'к'
        ? Promise.resolve(categories)
        : new Promise<Category[]>((resolve) => {
          release = resolve
        })
    )
    renderCombobox({ loadOptions })
    await userEvent.click(input())
    type('к')
    await waitFor(() => expect(screen.getByRole('option', { name: /Кровля/ })).toBeInTheDocument())
    type('кр')
    await waitFor(() => expect(spinner()).not.toBeNull())
    // прошлый результат на экране, пока идёт запрос
    expect(screen.getByRole('option', { name: /Кровля/ })).toBeInTheDocument()
    release([categories[0]!])
    await waitFor(() => expect(spinner()).toBeNull())
  })

  it('L5: ошибка — сообщение и «Retry» (кнопка); повтор зовёт загрузчик с той же строкой; onLoadError один раз', async () => {
    const onLoadError = vi.fn()
    let fail = true
    const loadOptions = vi.fn(async () => {
      if (fail) {
        throw new Error('сеть')
      }
      return categories
    })
    renderCombobox({ loadOptions, onLoadError })
    await userEvent.click(input())
    type('к')
    await waitFor(() => expect(screen.getByText('Failed to load')).toBeInTheDocument())
    expect(screen.queryByRole('option')).toBeNull()
    expect(onLoadError).toHaveBeenCalledTimes(1)

    fail = false
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(screen.getByRole('option', { name: /Кровля/ })).toBeInTheDocument())
    expect(loadOptions).toHaveBeenLastCalledWith('к', expect.anything())
    expect(screen.queryByText('Failed to load')).toBeNull()
    expect(onLoadError).toHaveBeenCalledTimes(1)
  })

  it('L5: Enter в поле при ошибке повторяет запрос', async () => {
    let fail = true
    const loadOptions = vi.fn(async () => {
      if (fail) {
        throw new Error('сеть')
      }
      return categories
    })
    renderCombobox({ loadOptions })
    await userEvent.click(input())
    type('к')
    await waitFor(() => expect(screen.getByText('Failed to load')).toBeInTheDocument())
    fail = false
    fireEvent.keyDown(input(), { key: 'Enter' })
    await waitFor(() => expect(screen.getByRole('option', { name: /Кровля/ })).toBeInTheDocument())
  })

  it('L6: после подтверждённого onCreate текущий поиск запрошен заново', async () => {
    const loadOptions = vi.fn(async () => categories)
    const onCreate = vi.fn().mockResolvedValue({ label: 'Новая', value: 'n' })
    renderCombobox({ loadOptions, onCreate })
    await userEvent.click(input())
    type('Zzz')
    await waitFor(() => expect(loadOptions).toHaveBeenCalledTimes(1))
    await userEvent.click(await screen.findByText(/Add "Zzz"/))
    await waitFor(() => expect(onCreate).toHaveBeenCalledWith('Zzz'))
    await waitFor(() => expect(loadOptions.mock.calls.length).toBeGreaterThanOrEqual(2))
  })

  it('L6: после подтверждённого onUpdate — перезапрос и новая подпись', async () => {
    let name = 'Кровля'
    const loadOptions = vi.fn(async () => [{ id: 'a', name }])
    const onUpdate = vi.fn(async () => {
      name = 'Кровля v2'
      return { label: name, value: 'a' }
    })
    renderCombobox({ loadOptions, onUpdate, initialLabel: 'Кровля' }, 'a')
    await userEvent.click(input())
    await waitFor(() => expect(loadOptions).toHaveBeenCalled())
    const before = loadOptions.mock.calls.length
    input().focus()
    fireEvent.keyDown(input(), { key: 'F2' })
    await waitFor(() => expect(onUpdate).toHaveBeenCalled())
    await waitFor(() => expect(loadOptions.mock.calls.length).toBeGreaterThan(before))
    await waitFor(() => expect(input().value).toBe('Кровля v2'))
  })

  it('L7: значения нет в выдаче — подпись из loadSelected; перерисовка не зовёт его снова', async () => {
    const loadSelected = vi.fn(async (value: string) => ({ id: value, name: 'Из loadSelected' }))
    const loadOptions = vi.fn(async () => categories)
    renderCombobox({ loadOptions, loadSelected }, 'zzz')
    await waitFor(() => expect(input().value).toBe('Из loadSelected'))
    await userEvent.click(input())
    await userEvent.click(document.body)
    expect(loadSelected).toHaveBeenCalledTimes(1)
  })

  it('L7: initialLabel сильнее — loadSelected не зовётся', async () => {
    const loadSelected = vi.fn(async (value: string) => ({ id: value, name: 'Из loadSelected' }))
    renderCombobox({ loadOptions: async () => categories, loadSelected, initialLabel: 'Из пропа' }, 'zzz')
    await waitFor(() => expect(input().value).toBe('Из пропа'))
    expect(loadSelected).not.toHaveBeenCalled()
  })

  it('L7: запись из loadSelected — data для onUpdate (карандаш у значения)', async () => {
    const onUpdate = vi.fn().mockResolvedValue(null)
    const loadSelected = vi.fn(async (value: string) => ({ id: value, name: 'Запись' }))
    renderCombobox({ loadOptions: async () => categories, loadSelected, onUpdate }, 'zzz')
    await waitFor(() => expect(input().value).toBe('Запись'))
    input().focus()
    fireEvent.keyDown(input(), { key: 'F2' })
    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'zzz', data: { id: 'zzz', name: 'Запись' } }),
      )
    )
  })
})

describe('Field.Combobox — статичные options: loading и подпись после поздней загрузки', () => {
  it('loading + пустые options — спиннер и «Loading...» в списке', async () => {
    renderCombobox({ options: [], loading: true })
    expect(spinner()).not.toBeNull()
    await userEvent.click(input())
    await waitFor(() => expect(screen.getByText('Loading...')).toBeInTheDocument())
  })

  it('options пришли после монтирования — подпись выбранного появляется', async () => {
    const { rerender } = renderCombobox({ options: [], loading: true }, 'a')
    expect(input().value).toBe('')
    rerender(
      <TestWrapper>
        <Form initialValue={{ cat: 'a' }} onSubmit={vi.fn()}>
          <Form.Field.Combobox name="cat" options={[{ label: 'Кровля', value: 'a' }]} />
        </Form>
      </TestWrapper>,
    )
    await waitFor(() => expect(input().value).toBe('Кровля'))
  })
})

describe('Field.Combobox — ровно один источник (L9)', () => {
  it('два источника через any — одно предупреждение в dev', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const props: Record<string, unknown> = {
      options: [{ label: 'Кровля', value: 'a' }],
      loadOptions: async () => categories,
    }
    renderCombobox(props)
    renderCombobox(props)
    await waitFor(() => expect(warn).toHaveBeenCalledTimes(1))
    expect(String(warn.mock.calls[0]![0])).toContain('источник')
  })

  it('типы: источники взаимоисключающи, getLabel/getValue обязательны для async', () => {
    // Compile-only: тест проверяет, что этот блок проходит typecheck; в рантайме ничего не рендерится
    const noop = () => null
    void noop
    const _ok = () => (
      <>
        <Form.Field.Combobox name="a" options={[{ label: 'A', value: 'a' }]} />
        <Form.Field.Combobox
          name="b"
          useQuery={() => ({ data: categories })}
          getLabel={(c) => c.name}
          getValue={(c) => c.id}
        />
        <Form.Field.Combobox
          name="c"
          loadOptions={async () => categories}
          getLabel={(c) => c.name}
          getValue={(c) => c.id}
          loadSelected={async () => categories[0] ?? null}
        />
        {/* @ts-expect-error — options и useQuery вместе */}
        <Form.Field.Combobox
          name="d"
          options={[]}
          useQuery={() => ({ data: categories })}
          getLabel={(c: Category) => c.name}
          getValue={(c: Category) => c.id}
        />
        {/* @ts-expect-error — options и loadOptions вместе */}
        <Form.Field.Combobox
          name="e"
          options={[]}
          loadOptions={async () => categories}
          getLabel={(c: Category) => c.name}
          getValue={(c: Category) => c.id}
        />
        {/* @ts-expect-error — useQuery и loadSelected (пара loadSelected — только loadOptions) */}
        <Form.Field.Combobox
          name="f"
          useQuery={() => ({ data: categories })}
          loadSelected={async () => null}
          getLabel={(c: Category) => c.name}
          getValue={(c: Category) => c.id}
        />
        {/* @ts-expect-error — loadOptions без getLabel/getValue */}
        <Form.Field.Combobox name="g" loadOptions={async () => categories} />
      </>
    )
    void _ok
    expect(true).toBe(true)
  })
})
