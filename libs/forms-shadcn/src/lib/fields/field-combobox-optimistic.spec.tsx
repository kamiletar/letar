import { TestForm } from '@letar/forms-react/testing'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FieldCombobox } from './field-combobox'

const options = [
  { label: 'React', value: 'react' },
  { label: 'Vue', value: 'vue' },
]

type Created = { label: string; value: string } | null
type Ctx = { optimistic: (p: { label: string }) => void }

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
      <FieldCombobox name="framework" options={options} {...props} />
    </TestForm>,
  )
  return { values: () => form.state.values as { framework: string }, form: () => form }
}

const optimisticCreate = (server: ReturnType<typeof deferred<Created>>) =>
  vi.fn(async (_search: string, ctx: Ctx) => {
    ctx.optimistic({ label: 'Solid' })
    return server.promise
  })

function pickCreateItem() {
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Sol' } })
  fireEvent.click(screen.getByRole('option', { name: '+ Добавить "Sol"' }))
}

describe('FieldCombobox (shadcn) — оптимистичный режим (§16.7)', () => {
  it('O1: подпись новой записи в поле сразу, значение формы прежнее; после ответа — настоящее', async () => {
    const server = deferred<Created>()
    const { values } = setup({ onCreate: optimisticCreate(server) })
    pickCreateItem()

    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('Solid'))
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-busy', 'true')
    expect(values().framework).toBe('')

    await act(async () => server.resolve({ label: 'Solid', value: 'solid' }))
    await waitFor(() => expect(values().framework).toBe('solid'))
    expect(screen.getByRole('combobox')).not.toHaveAttribute('aria-busy')
    expect(screen.getByRole('combobox')).toHaveValue('Solid')
  })

  it('O3: отказ — текст ввода возвращается к прежнему, значение формы не менялось, есть сообщение', async () => {
    const server = deferred<Created>()
    const { values } = setup({ onCreate: optimisticCreate(server) }, 'react')
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('React'))
    pickCreateItem()
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('Solid'))

    await act(async () => server.resolve(null))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Не удалось сохранить «Solid»'))
    expect(screen.getByRole('combobox')).toHaveValue('React')
    expect(values().framework).toBe('react')
  })

  it('O4: пока create ждёт, пользователь выбрал другое — подтверждение его выбор не перебивает', async () => {
    const server = deferred<Created>()
    const { values } = setup({ onCreate: optimisticCreate(server) })
    pickCreateItem()
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('Solid'))

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Vu' } })
    fireEvent.click(await screen.findByRole('option', { name: 'Vue' }))
    await waitFor(() => expect(values().framework).toBe('vue'))

    await act(async () => server.resolve({ label: 'Solid', value: 'solid' }))
    expect(values().framework).toBe('vue')
  })

  it('O11: pending-опция приложения приглушена и не выбирается', async () => {
    const { values } = setup({
      options: [{ label: 'React', value: 'react' }, { label: 'Новая', value: 'tmp', pending: true }],
    })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Нов' } })
    const pending = await screen.findByRole('option', { name: /Новая/ })
    expect(pending).toHaveAttribute('data-pending')
    fireEvent.click(pending)
    expect(values().framework).toBe('')
  })
})
