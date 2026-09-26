import { TestForm } from '@letar/forms-react/testing'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { FieldCombobox } from './field-combobox'
import { FieldSelect } from './field-select'

const options = [
  { label: 'Кровля', value: 'a' },
  { label: 'Фасад', value: 'b' },
  { label: 'Системная', value: 's', editable: false },
]

beforeAll(() => {
  // Radix Select опирается на API указателя и прокрутки, которых нет в jsdom
  Element.prototype.hasPointerCapture = vi.fn(() => false)
  Element.prototype.setPointerCapture = vi.fn()
  Element.prototype.releasePointerCapture = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

const deferred = <T,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

function setupSelect(props: Record<string, unknown> = {}, initial = 'a') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- инстанс TanStack Form
  let form: any
  render(
    <TestForm defaultValues={{ cat: initial }} onFormReady={(f) => (form = f)}>
      <FieldSelect name="cat" options={options} {...props} />
    </TestForm>,
  )
  return { values: () => form.state.values as { cat: string }, form: () => form }
}

const openSelect = () =>
  fireEvent.pointerDown(screen.getByRole('combobox'), { button: 0, ctrlKey: false, pointerType: 'mouse' })
const pencils = () => Array.from(document.querySelectorAll<HTMLElement>('[data-part="edit-button"]'))
const itemPencils = () => pencils().filter((el) => el.closest('[role="option"]'))
const valuePencil = () => pencils().find((el) => !el.closest('[role="option"]'))

describe('FieldSelect (shadcn) — onUpdate', () => {
  it('без onUpdate карандашей нет', async () => {
    setupSelect()
    openSelect()
    await screen.findByRole('option', { name: 'Фасад' })
    expect(pencils()).toHaveLength(0)
  })

  it('карандаш у каждой редактируемой опции; editable:false скрывает; в пункте вне Tab и скрыт от AT', async () => {
    setupSelect({ onUpdate: vi.fn() })
    openSelect()
    await screen.findByRole('option', { name: /Фасад/ })
    expect(itemPencils()).toHaveLength(2)
    expect(itemPencils()[0]).toHaveAttribute('tabindex', '-1')
    expect(itemPencils()[0]).toHaveAttribute('aria-hidden', 'true')
  })

  it('карандаш у значения — соседом триггера, не внутри него', () => {
    setupSelect({ onUpdate: vi.fn() })
    const pencil = valuePencil()
    expect(pencil).toBeDefined()
    expect(pencil!.closest('button[role="combobox"]')).toBeNull()
  })

  it('клик по карандашу вызывает onUpdate с опцией и не выбирает пункт', async () => {
    const onUpdate = vi.fn().mockResolvedValue(null)
    const { values } = setupSelect({ onUpdate })
    openSelect()
    await screen.findByRole('option', { name: /Фасад/ })
    fireEvent.pointerDown(itemPencils()[1])
    fireEvent.pointerUp(itemPencils()[1])
    fireEvent.click(itemPencils()[1])
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ value: 'b', label: 'Фасад' }))
    expect(values().cat).toBe('a')
  })

  it('тот же value: подпись обновляется, форма не dirty', async () => {
    const onUpdate = vi.fn().mockResolvedValue({ label: 'Кровля (новая)', value: 'a' })
    const { form } = setupSelect({ onUpdate })
    fireEvent.click(valuePencil()!)
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('Кровля (новая)'))
    expect(form().state.isDirty).toBe(false)
  })

  it('другой value: выбранное значение заменяется на новое', async () => {
    const onUpdate = vi.fn().mockResolvedValue({ label: 'Кровля v2', value: 'a2' })
    const { values } = setupSelect({ onUpdate })
    fireEvent.click(valuePencil()!)
    await waitFor(() => expect(values().cat).toBe('a2'))
    expect(screen.getByRole('combobox')).toHaveTextContent('Кровля v2')
  })

  it('null — ничего не меняется; повторный вызов при pending игнорируется', async () => {
    const pending = deferred<null>()
    const onUpdate = vi.fn().mockReturnValue(pending.promise)
    setupSelect({ onUpdate })
    fireEvent.click(valuePencil()!)
    await waitFor(() => expect(valuePencil()).toBeDisabled())
    fireEvent.click(valuePencil()!)
    expect(onUpdate).toHaveBeenCalledTimes(1)
    await act(async () => pending.resolve(null))
    await waitFor(() => expect(valuePencil()).not.toBeDisabled())
    expect(screen.getByRole('combobox')).toHaveTextContent('Кровля')
  })

  it('у системной опции карандаша у значения нет; у disabled поля — тоже', () => {
    setupSelect({ onUpdate: vi.fn() }, 's')
    expect(valuePencil()).toBeUndefined()
  })

  it('F2 на триггере правит выбранное значение', async () => {
    const onUpdate = vi.fn().mockResolvedValue(null)
    setupSelect({ onUpdate })
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'F2' })
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ value: 'a' }))
  })

  it('свой renderOption без EditButton — карандаша в пункте нет; CreateButton в listFooter зовёт onCreate', async () => {
    const onCreate = vi.fn().mockResolvedValue({ label: 'Новая', value: 'n' })
    setupSelect({
      onUpdate: vi.fn(),
      onCreate,
      createItem: false,
      renderOption: (o: { label: unknown }) => <span>{o.label as string}</span>,
      listFooter: <FieldSelect.CreateButton />,
    })
    openSelect()
    await screen.findByRole('option', { name: /Фасад/ })
    expect(itemPencils()).toHaveLength(0)
    fireEvent.click(screen.getByText('+ Добавить…'))
    expect(onCreate).toHaveBeenCalledWith('')
  })
})

describe('FieldCombobox (shadcn) — onUpdate', () => {
  function setupCombobox(props: Record<string, unknown> = {}, initial = '') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- инстанс TanStack Form
    let form: any
    render(
      <TestForm defaultValues={{ cat: initial }} onFormReady={(f) => (form = f)}>
        <FieldCombobox name="cat" options={options} {...props} />
      </TestForm>,
    )
    return { values: () => form.state.values as { cat: string } }
  }

  it('карандаш у опций и у значения; клик зовёт onUpdate, пункт не выбирается', async () => {
    const onUpdate = vi.fn().mockResolvedValue(null)
    const { values } = setupCombobox({ onUpdate }, 'a')
    expect(valuePencil()).toBeDefined()
    await userEvent.click(screen.getByRole('combobox'))
    await waitFor(() => expect(itemPencils()).toHaveLength(2))
    fireEvent.click(itemPencils()[1])
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ value: 'b' }))
    expect(values().cat).toBe('a')
  })

  it('другой value: значение формы переезжает', async () => {
    const onUpdate = vi.fn().mockResolvedValue({ label: 'Кровля v2', value: 'a2' })
    const { values } = setupCombobox({ onUpdate }, 'a')
    fireEvent.click(valuePencil()!)
    await waitFor(() => expect(values().cat).toBe('a2'))
  })

  it('пустой результат: сообщение и пункт «+ Добавить "<поиск>"»; renderEmpty заменяет сообщение', async () => {
    setupCombobox({ onCreate: vi.fn(), renderEmpty: ({ search }: { search: string }) => <i>Нет «{search}»</i> })
    await userEvent.click(screen.getByRole('combobox'))
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Zzz' } })
    await waitFor(() => expect(screen.getByText('Нет «Zzz»')).toBeInTheDocument())
    expect(screen.getByText('+ Добавить "Zzz"')).toBeInTheDocument()
  })

  it('CreateButton в listFooter зовёт onCreate с текстом поиска', async () => {
    const onCreate = vi.fn().mockResolvedValue({ label: 'Новая', value: 'n' })
    setupCombobox({ onCreate, createItem: false, listFooter: <FieldCombobox.CreateButton /> })
    await userEvent.click(screen.getByRole('combobox'))
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Нов' } })
    await waitFor(() => expect(screen.getByText('+ Добавить "Нов"')).toBeInTheDocument())
    fireEvent.click(screen.getByText('+ Добавить "Нов"'))
    expect(onCreate).toHaveBeenCalledWith('Нов')
  })
})
