import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

const options = [
  { value: 'a', label: 'Кровля' },
  { value: 'b', label: 'Фасад' },
  { value: 's', label: 'Системная', editable: false },
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
  vi.restoreAllMocks()
})

const deferred = <T,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

function renderSelect(props: Record<string, unknown> = {}, initial = 'a', onSubmit = vi.fn()) {
  render(
    <TestWrapper>
      <Form initialValue={{ cat: initial }} onSubmit={onSubmit}>
        <Form.Field.Select name="cat" options={options} {...props} />
        <Form.Button.Submit>ok</Form.Button.Submit>
      </Form>
    </TestWrapper>,
  )
  return onSubmit
}

const openList = () => userEvent.click(screen.getByRole('combobox'))
const pencils = () => Array.from(document.querySelectorAll<HTMLElement>('[data-part="edit-button"]'))
const itemPencils = () => pencils().filter((el) => el.closest('[role="option"]'))
const valuePencil = () => pencils().find((el) => !el.closest('[role="option"]'))

describe('Field.Select — onUpdate', () => {
  it('без onUpdate карандашей нет', async () => {
    renderSelect()
    await openList()
    expect(pencils()).toHaveLength(0)
  })

  it('карандаш у каждой редактируемой опции, editable:false скрывает', async () => {
    renderSelect({ onUpdate: vi.fn() })
    await openList()
    await waitFor(() => expect(itemPencils()).toHaveLength(2))
    expect(itemPencils()[0]).toHaveAttribute('tabindex', '-1')
    expect(itemPencils()[0]).toHaveAttribute('aria-hidden', 'true')
  })

  it('клик по карандашу вызывает onUpdate с опцией и не выбирает пункт', async () => {
    const onUpdate = vi.fn().mockResolvedValue(null)
    renderSelect({ onUpdate })
    await openList()
    await waitFor(() => expect(itemPencils()).toHaveLength(2))
    await userEvent.click(itemPencils()[1])
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ value: 'b', label: 'Фасад' }), expect.anything())
    expect(screen.getByRole('combobox')).toHaveTextContent('Кровля')
  })

  it('тот же value: подпись обновляется, форма не dirty', async () => {
    const onUpdate = vi.fn().mockResolvedValue({ label: 'Кровля (новая)', value: 'a' })
    renderSelect({ onUpdate })
    await userEvent.click(valuePencil()!)
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('Кровля (новая)'))
  })

  it('другой value: выбранное значение заменяется на новое', async () => {
    const onUpdate = vi.fn().mockResolvedValue({ label: 'Кровля v2', value: 'a2' })
    const onSubmit = renderSelect({ onUpdate })
    await userEvent.click(valuePencil()!)
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('Кровля v2'))
    await userEvent.click(screen.getByText('ok'))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toEqual({ cat: 'a2' })
  })

  it('null — ничего не меняется', async () => {
    renderSelect({ onUpdate: vi.fn().mockResolvedValue(null) })
    await userEvent.click(valuePencil()!)
    await waitFor(() => expect(valuePencil()).not.toBeDisabled())
    expect(screen.getByRole('combobox')).toHaveTextContent('Кровля')
  })

  it('пока идёт действие, карандаш disabled, повторный вызов игнорируется', async () => {
    const pending = deferred<null>()
    const onUpdate = vi.fn().mockReturnValue(pending.promise)
    renderSelect({ onUpdate })
    await userEvent.click(valuePencil()!)
    await waitFor(() => expect(valuePencil()).toBeDisabled())
    await userEvent.click(valuePencil()!)
    expect(onUpdate).toHaveBeenCalledTimes(1)
    await act(async () => pending.resolve(null))
    await waitFor(() => expect(valuePencil()).not.toBeDisabled())
  })

  it('у системной опции (editable:false) карандаша у значения нет', async () => {
    renderSelect({ onUpdate: vi.fn() }, 's')
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('Системная'))
    expect(valuePencil()).toBeUndefined()
  })

  it('disabled поле — карандашей нет', async () => {
    renderSelect({ onUpdate: vi.fn(), disabled: true })
    expect(valuePencil()).toBeUndefined()
  })

  it('F2 на триггере правит выбранное значение', async () => {
    const onUpdate = vi.fn().mockResolvedValue(null)
    renderSelect({ onUpdate })
    screen.getByRole('combobox').focus()
    await userEvent.keyboard('{F2}')
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ value: 'a' }), expect.anything())
  })

  it('свой renderOption без EditButton — карандаша в пункте нет; с EditButton — есть', async () => {
    const onUpdate = vi.fn()
    const { unmount } = render(
      <TestWrapper>
        <Form initialValue={{ cat: 'a' }} onSubmit={vi.fn()}>
          <Form.Field.Select
            name="cat"
            options={options}
            onUpdate={onUpdate}
            renderOption={(o) => <span>{o.label}</span>}
          />
        </Form>
      </TestWrapper>,
    )
    await openList()
    expect(itemPencils()).toHaveLength(0)
    unmount()

    render(
      <TestWrapper>
        <Form initialValue={{ cat: 'a' }} onSubmit={vi.fn()}>
          <Form.Field.Select
            name="cat"
            options={options}
            onUpdate={onUpdate}
            renderOption={(o) => (
              <span>
                {o.label}
                <Form.Field.Select.EditButton />
              </span>
            )}
          />
        </Form>
      </TestWrapper>,
    )
    await openList()
    await waitFor(() => expect(itemPencils().length).toBeGreaterThan(0))
  })

  it('CreateButton в listFooter вызывает onCreate; createItem=false убирает служебный пункт', async () => {
    const onCreate = vi.fn().mockResolvedValue({ label: 'Новая', value: 'n' })
    renderSelect({ onCreate, createItem: false, listFooter: <Form.Field.Select.CreateButton /> })
    await openList()
    expect(screen.getAllByText(/Add…/)).toHaveLength(1)
    await userEvent.click(screen.getByText(/Add…/))
    expect(onCreate).toHaveBeenCalledWith('', expect.anything())
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('Новая'))
  })

  it('из пункта: фокус на триггере в момент вызова onUpdate, список закрыт до резолва', async () => {
    let activeAtCall: Element | null = null
    const pending = deferred<null>()
    const onUpdate = vi.fn().mockImplementation(() => {
      activeAtCall = document.activeElement
      return pending.promise
    })
    renderSelect({ onUpdate })
    await openList()
    await waitFor(() => expect(itemPencils()).toHaveLength(2))
    await userEvent.click(itemPencils()[0])
    expect(activeAtCall).toBe(screen.getByRole('combobox'))
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false'))
    await act(async () => pending.resolve(null))
  })

  it('доступное имя пункта не меняется от карандаша', async () => {
    renderSelect({ onUpdate: vi.fn() })
    await openList()
    await waitFor(() => expect(itemPencils()).toHaveLength(2))
    expect(screen.getByRole('option', { name: 'Кровля' })).toBeInTheDocument()
  })

  it('EditButton внутри renderValue — ничего не рисует, в триггере нет вложенных кнопок', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    renderSelect({
      onUpdate: vi.fn(),
      renderValue: (o: { label: unknown }) => (
        <span>
          {o.label as string}
          <Form.Field.Select.EditButton />
        </span>
      ),
    })
    const trigger = screen.getByRole('combobox')
    await waitFor(() => expect(trigger).toHaveTextContent('Кровля'))
    expect(trigger.querySelector('button')).toBeNull()
    expect(warn).toHaveBeenCalled()
  })

  it('размонтирование при открытом окне: после резолва нет ошибок и handleChange', async () => {
    const pending = deferred<{ label: string; value: string }>()
    const onUpdate = vi.fn().mockReturnValue(pending.promise)
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    renderSelect({ onUpdate })
    await userEvent.click(valuePencil()!)
    cleanup()
    await act(async () => pending.resolve({ label: 'Кровля v2', value: 'a2' }))
    expect(errors).not.toHaveBeenCalled()
  })
})
