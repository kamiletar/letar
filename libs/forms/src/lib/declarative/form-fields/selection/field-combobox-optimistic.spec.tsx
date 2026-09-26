import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef, type ReactNode, type RefObject } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { Form } from '../../'
import type { AppFormApi } from '../../types'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

const baseOptions = [
  { label: 'Кровля', value: 'roof' },
  { label: 'Фундамент', value: 'base' },
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

const deferred = <T,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

type Created = { label: string; value: string } | null
type Ctx = { optimistic: (p: { label: string }) => void }

// Общий ref формы: Form пишет в него `current`, тесты читают значение напрямую
const formRef: RefObject<AppFormApi | null> = createRef<AppFormApi | null>()
const formValue = () => formRef.current?.getFieldValue('categoryId')

function Harness(props: {
  onCreate?: (search: string, ctx: Ctx) => Promise<Created>
  onSettleError?: (info: unknown) => void
  onSubmit?: (value: unknown) => void
  options?: Array<{ label: string; value: string; pending?: boolean }>
  initial?: string
}) {
  return (
    <TestWrapper>
      <Form
        initialValue={{ categoryId: props.initial ?? '' }}
        onSubmit={props.onSubmit ?? vi.fn()}
        formRef={formRef}
      >
        <Form.Field.Combobox
          name="categoryId"
          options={props.options ?? baseOptions}
          onCreate={props.onCreate}
          onSettleError={props.onSettleError as never}
          createLabel="Добавить"
        />
        <Form.Button.Submit>Сохранить</Form.Button.Submit>
      </Form>
    </TestWrapper>
  )
}

async function pickCreateItem(text = 'Фас') {
  const input = screen.getByRole('combobox')
  await userEvent.click(input)
  fireEvent.change(input, { target: { value: text } })
  await userEvent.click(await screen.findByRole('option', { name: `+ Добавить "${text}"` }))
}

const optimisticCreate = (server: ReturnType<typeof deferred<Created>>) =>
  vi.fn(async (_search: string, ctx: Ctx) => {
    ctx.optimistic({ label: 'Фасады' })
    return server.promise
  })

describe('Field.Combobox — оптимистичный режим (§16.7)', () => {
  it('O1: подпись новой записи в поле сразу, значение формы прежнее; после ответа — настоящее', async () => {
    const server = deferred<Created>()
    render(<Harness onCreate={optimisticCreate(server)} />)

    await pickCreateItem()

    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('Фасады'))
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-busy', 'true')
    expect(formValue()).toBe('')

    await act(async () => server.resolve({ label: 'Фасады', value: 'facades' }))
    await waitFor(() => expect(formValue()).toBe('facades'))
    expect(screen.getByRole('combobox')).not.toHaveAttribute('aria-busy')
    expect(screen.getByRole('combobox')).toHaveValue('Фасады')
  })

  it('O8: отправка ждёт подтверждения и уходит с настоящим значением', async () => {
    const server = deferred<Created>()
    const onSubmit = vi.fn()
    render(<Harness onCreate={optimisticCreate(server)} onSubmit={onSubmit} />)
    await pickCreateItem()
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('Фасады'))

    await userEvent.click(screen.getByRole('button', { name: /Сохранить/ }))
    expect(onSubmit).not.toHaveBeenCalled()

    await act(async () => server.resolve({ label: 'Фасады', value: 'facades' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0]![0]).toEqual({ categoryId: 'facades' })
  })

  it('O3: отказ — текст ввода возвращается к прежнему, значение формы не менялось, есть сообщение', async () => {
    const server = deferred<Created>()
    render(<Harness onCreate={optimisticCreate(server)} initial="roof" />)
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('Кровля'))
    await pickCreateItem()
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('Фасады'))

    await act(async () => server.resolve(null))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Could not save “Фасады”'))
    expect(screen.getByRole('combobox')).toHaveValue('Кровля')
    expect(formValue()).toBe('roof')
  })

  it('O4: пока create ждёт, пользователь выбрал другое — подтверждение его выбор не перебивает', async () => {
    const server = deferred<Created>()
    render(<Harness onCreate={optimisticCreate(server)} />)
    await pickCreateItem()
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('Фасады'))

    await userEvent.click(screen.getByRole('combobox'))
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Фунд' } })
    await userEvent.click(await screen.findByRole('option', { name: 'Фундамент' }))
    await waitFor(() => expect(formValue()).toBe('base'))

    await act(async () => server.resolve({ label: 'Фасады', value: 'facades' }))
    expect(formValue()).toBe('base')
    expect(screen.getByRole('combobox')).toHaveValue('Фундамент')
  })

  it('O5: внешний setFieldValue во время ожидания снимает ожидающий выбор', async () => {
    const server = deferred<Created>()
    render(<Harness onCreate={optimisticCreate(server)} />)
    await pickCreateItem()
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('Фасады'))

    await act(async () => formRef.current?.setFieldValue('categoryId', 'roof'))
    await act(async () => server.resolve({ label: 'Фасады', value: 'facades' }))

    expect(formValue()).toBe('roof')
  })

  it('O11: pending-опция приложения приглушена и не выбирается', async () => {
    render(
      <Harness
        options={[{ label: 'Кровля', value: 'roof' }, { label: 'Фасады', value: 'tmp', pending: true }]}
      />,
    )
    const input = screen.getByRole('combobox')
    await userEvent.click(input)
    const pending = await screen.findByRole('option', { name: /Фасады/ })
    expect(pending).toHaveAttribute('data-pending')
    await userEvent.click(pending)
    expect(formValue()).toBe('')
  })
})
