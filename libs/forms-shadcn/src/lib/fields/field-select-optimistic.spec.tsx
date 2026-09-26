import { useFormPendingSnapshot } from '@letar/forms-react'
import { TestForm } from '@letar/forms-react/testing'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { FieldSelect } from './field-select'

const options = [
  { label: 'React', value: 'react' },
  { label: 'Vue', value: 'vue' },
]

type Created = { label: string; value: string } | null
type Ctx = { optimistic: (p: { label: string }) => void }

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

function setup(props: Record<string, unknown>, initial = '') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- инстанс TanStack Form
  let form: any
  render(
    <TestForm defaultValues={{ framework: initial }} onFormReady={(f) => (form = f)}>
      <FieldSelect name="framework" options={options} {...props} />
      <SubmitStateProbe />
    </TestForm>,
  )
  return { values: () => form.state.values as { framework: string }, form: () => form }
}

/** Проба: показывает, сколько действий ждёт сервера */
function SubmitStateProbe() {
  const { count } = useFormPendingSnapshot()
  return <span data-testid="pending-count">{count}</span>
}

function openSelect() {
  fireEvent.pointerDown(screen.getByRole('combobox'), { button: 0, ctrlKey: false, pointerType: 'mouse' })
}

const optimisticCreate = (server: ReturnType<typeof deferred<Created>>) =>
  vi.fn(async (_search: string, ctx: Ctx) => {
    ctx.optimistic({ label: 'Solid' })
    return server.promise
  })

describe('FieldSelect (shadcn) — оптимистичный режим (§16.7)', () => {
  it('O1: подпись новой записи в триггере сразу, значение формы прежнее; после ответа — настоящее', async () => {
    const server = deferred<Created>()
    const { values } = setup({ onCreate: optimisticCreate(server) })
    openSelect()
    fireEvent.click(await screen.findByRole('option', { name: '+ Добавить…' }))

    await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('Solid'))
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-busy', 'true')
    expect(values().framework).toBe('')

    await act(async () => server.resolve({ label: 'Solid', value: 'solid' }))
    await waitFor(() => expect(values().framework).toBe('solid'))
    expect(screen.getByRole('combobox')).not.toHaveAttribute('aria-busy')
    expect(screen.getByRole('combobox')).toHaveTextContent('Solid')
  })

  it('O3: отказ — откат к прежнему значению и встроенное сообщение', async () => {
    const server = deferred<Created>()
    const { values } = setup({ onCreate: optimisticCreate(server) }, 'react')
    openSelect()
    fireEvent.click(await screen.findByRole('option', { name: '+ Добавить…' }))
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('Solid'))

    await act(async () => server.resolve(null))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Не удалось сохранить «Solid»'))
    expect(screen.getByRole('combobox')).toHaveTextContent('React')
    expect(values().framework).toBe('react')
  })

  it('O3: с onSettleError встроенного сообщения нет, причина передана', async () => {
    const server = deferred<Created>()
    const onSettleError = vi.fn()
    setup({ onCreate: optimisticCreate(server), onSettleError })
    openSelect()
    fireEvent.click(await screen.findByRole('option', { name: '+ Добавить…' }))
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('Solid'))

    await act(async () => server.resolve(null))

    await waitFor(() =>
      expect(onSettleError).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'create',
          reason: 'declined',
          preview: expect.objectContaining({ label: 'Solid' }),
        }),
      )
    )
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('O8: действие ждёт сервера — реестр формы считает его, после ответа очищается', async () => {
    const server = deferred<Created>()
    setup({ onCreate: optimisticCreate(server) })
    openSelect()
    fireEvent.click(await screen.findByRole('option', { name: '+ Добавить…' }))

    await waitFor(() => expect(screen.getByTestId('pending-count')).toHaveTextContent('1'))
    await act(async () => server.resolve({ label: 'Solid', value: 'solid' }))
    await waitFor(() => expect(screen.getByTestId('pending-count')).toHaveTextContent('0'))
  })

  it('O11: pending-опция приложения приглушена и не выбирается', async () => {
    const { values } = setup(
      { options: [{ label: 'React', value: 'react' }, { label: 'Новая', value: 'tmp', pending: true }] },
      'react',
    )
    openSelect()
    const pending = await screen.findByRole('option', { name: /Новая/ })
    expect(pending).toHaveAttribute('data-pending')
    fireEvent.click(pending)
    expect(values().framework).toBe('react')
  })
})
