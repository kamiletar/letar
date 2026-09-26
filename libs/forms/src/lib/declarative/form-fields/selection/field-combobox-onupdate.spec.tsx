import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ReactNode } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

const options = [
  { label: 'Кровля', value: 'a' },
  { label: 'Фасад', value: 'b' },
  { label: 'Системная', value: 's', editable: false },
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

function renderCombobox(props: Record<string, unknown> = {}, initial = '', onSubmit = vi.fn()) {
  render(
    <TestWrapper>
      <Form initialValue={{ cat: initial }} onSubmit={onSubmit}>
        <Form.Field.Combobox name="cat" options={options} {...props} />
        <button type="submit">go</button>
      </Form>
    </TestWrapper>,
  )
  return onSubmit
}

const input = () => screen.getByRole('combobox') as HTMLInputElement
const pencils = () => Array.from(document.querySelectorAll<HTMLElement>('[data-part="edit-button"]'))
const itemPencils = () => pencils().filter((el) => el.closest('[role="option"]'))
const valuePencil = () => pencils().find((el) => !el.closest('[role="option"]'))

describe('Field.Combobox — onUpdate', () => {
  it('без onUpdate карандашей нет', async () => {
    renderCombobox()
    await userEvent.click(input())
    expect(pencils()).toHaveLength(0)
  })

  it('карандаш у каждой редактируемой опции, editable:false скрывает', async () => {
    renderCombobox({ onUpdate: vi.fn() })
    await userEvent.click(input())
    await waitFor(() => expect(itemPencils()).toHaveLength(2))
  })

  it('клик по карандашу вызывает onUpdate и не выбирает пункт', async () => {
    const onUpdate = vi.fn().mockResolvedValue(null)
    renderCombobox({ onUpdate })
    await userEvent.click(input())
    await waitFor(() => expect(itemPencils()).toHaveLength(2))
    await userEvent.click(itemPencils()[1])
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ value: 'b', label: 'Фасад' }))
    expect(input().value).toBe('')
  })

  it('правка выбранного (тот же value): инпут показывает новую подпись', async () => {
    const onUpdate = vi.fn().mockResolvedValue({ label: 'Кровля (новая)', value: 'a' })
    renderCombobox({ onUpdate }, 'a')
    await waitFor(() => expect(valuePencil()).toBeDefined())
    await userEvent.click(valuePencil()!)
    await waitFor(() => expect(input().value).toBe('Кровля (новая)'))
  })

  it('правка выбранного (другой value): значение формы переезжает', async () => {
    const onUpdate = vi.fn().mockResolvedValue({ label: 'Кровля v2', value: 'a2' })
    const onSubmit = renderCombobox({ onUpdate }, 'a')
    await waitFor(() => expect(valuePencil()).toBeDefined())
    await userEvent.click(valuePencil()!)
    await waitFor(() => expect(input().value).toBe('Кровля v2'))
    await userEvent.click(screen.getByText('go'))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toEqual({ cat: 'a2' })
  })

  it('F2 в инпуте правит выбранное значение', async () => {
    const onUpdate = vi.fn().mockResolvedValue(null)
    renderCombobox({ onUpdate }, 'a')
    input().focus()
    await userEvent.keyboard('{F2}')
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ value: 'a' }))
  })

  it('disabled поле — карандашей нет', () => {
    renderCombobox({ onUpdate: vi.fn(), disabled: true }, 'a')
    expect(valuePencil()).toBeUndefined()
  })

  it('пустой результат: сообщение и пункт «+ Add "<поиск>"»', async () => {
    renderCombobox({ onCreate: vi.fn() })
    await userEvent.click(input())
    fireEvent.change(input(), { target: { value: 'Zzz' } })
    await waitFor(() => expect(screen.getByText('Nothing found')).toBeInTheDocument())
    expect(screen.getByText(/Add "Zzz"/)).toBeInTheDocument()
  })

  it('renderEmpty заменяет сообщение', async () => {
    renderCombobox({ renderEmpty: ({ search }: { search: string }) => <i>Нет «{search}»</i> })
    await userEvent.click(input())
    fireEvent.change(input(), { target: { value: 'Zzz' } })
    await waitFor(() => expect(screen.getByText('Нет «Zzz»')).toBeInTheDocument())
  })

  it('CreateButton в listFooter зовёт onCreate с текстом поиска; createItem=false убирает служебный пункт', async () => {
    const onCreate = vi.fn().mockResolvedValue({ label: 'Новая', value: 'n' })
    renderCombobox({ onCreate, createItem: false, listFooter: <Form.Field.Combobox.CreateButton /> })
    await userEvent.click(input())
    fireEvent.change(input(), { target: { value: 'Нов' } })
    await waitFor(() => expect(screen.getAllByText(/Add "Нов"/)).toHaveLength(1))
    await userEvent.click(screen.getByText(/Add "Нов"/))
    expect(onCreate).toHaveBeenCalledWith('Нов')
    await waitFor(() => expect(input().value).toBe('Новая'))
  })
})
