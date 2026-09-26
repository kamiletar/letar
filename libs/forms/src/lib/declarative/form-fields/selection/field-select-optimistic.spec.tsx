import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { act, render, screen, waitFor } from '@testing-library/react'
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
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

type Created = { label: string; value: string } | null

// Общий ref формы: Form пишет в него `current`, тесты читают значение напрямую
const formRef: RefObject<AppFormApi | null> = createRef<AppFormApi | null>()

/** Форма с Select + кнопка отправки; `formRef` даёт читать значение формы напрямую */
function Harness(props: {
  onCreate?: (search: string, ctx: { optimistic: (p: { label: string }) => void }) => Promise<Created>
  onUpdate?: (option: unknown, ctx: { optimistic: (p: { label: string }) => void }) => Promise<Created>
  onSettleError?: (info: unknown) => void
  onSubmit?: (value: unknown) => void
  options?: Array<{ label: string; value: string; pending?: boolean }>
  initial?: string
}) {
  return (
    <TestWrapper>
      <Form
        initialValue={{ category: props.initial ?? '' }}
        onSubmit={props.onSubmit ?? vi.fn()}
        formRef={formRef}
      >
        <Form.Field.Select
          name="category"
          options={props.options ?? baseOptions}
          onCreate={props.onCreate}
          onUpdate={props.onUpdate as never}
          onSettleError={props.onSettleError as never}
          createLabel="Добавить…"
        />
        <Form.Button.Submit>Сохранить</Form.Button.Submit>
      </Form>
    </TestWrapper>
  )
}

const formValue = () => formRef.current?.getFieldValue('category')

async function createOptimistically(server: ReturnType<typeof deferred<Created>>, label = 'Фасады') {
  const onCreate = vi.fn(async (_search: string, ctx: { optimistic: (p: { label: string }) => void }) => {
    ctx.optimistic({ label })
    return server.promise
  })
  return onCreate
}

async function pickCreateItem() {
  await userEvent.click(screen.getByRole('combobox'))
  await userEvent.click(await screen.findByRole('option', { name: '+ Добавить…' }))
}

describe('Field.Select — оптимистичный режим (§16.7)', () => {
  it('O1: сразу после optimistic новая подпись в триггере, aria-busy, значение формы прежнее; после ответа — настоящее', async () => {
    const server = deferred<Created>()
    const onCreate = await createOptimistically(server)
    render(<Harness onCreate={onCreate} />)

    await pickCreateItem()

    await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('Фасады'))
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-busy', 'true')
    expect(formValue()).toBe('')

    await act(async () => server.resolve({ label: 'Фасады', value: 'facades' }))
    await waitFor(() => expect(formValue()).toBe('facades'))
    expect(screen.getByRole('combobox')).not.toHaveAttribute('aria-busy')
    expect(screen.getByRole('combobox')).toHaveTextContent('Фасады')
  })

  it('O8: отправка во время ожидания ждёт подтверждения и уходит с настоящим значением; двойной клик — одна отправка', async () => {
    const server = deferred<Created>()
    const onCreate = await createOptimistically(server)
    const onSubmit = vi.fn()
    render(<Harness onCreate={onCreate} onSubmit={onSubmit} />)
    await pickCreateItem()
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('Фасады'))

    const submit = screen.getByRole('button', { name: /Сохранить/ })
    await userEvent.click(submit)
    await userEvent.click(submit)
    expect(onSubmit).not.toHaveBeenCalled()

    await act(async () => server.resolve({ label: 'Фасады', value: 'facades' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0]![0]).toEqual({ category: 'facades' })
  })

  it('O8: отказ при ждущей отправке — onSubmit не вызван', async () => {
    const server = deferred<Created>()
    const onCreate = await createOptimistically(server)
    const onSubmit = vi.fn()
    render(<Harness onCreate={onCreate} onSubmit={onSubmit} />)
    await pickCreateItem()
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('Фасады'))

    await userEvent.click(screen.getByRole('button', { name: /Сохранить/ }))
    await act(async () => server.resolve(null))

    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument())
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('O3: отказ — откат, встроенное сообщение; следующее действие его убирает', async () => {
    const server = deferred<Created>()
    const onCreate = vi
      .fn<(search: string, ctx: { optimistic: (p: { label: string }) => void }) => Promise<Created>>()
      .mockImplementationOnce(async (_search, ctx) => {
        ctx.optimistic({ label: 'Фасады' })
        return server.promise
      })
      // Второй запуск: окно приложения открыто и не закрывается — обычное интерактивное действие
      .mockImplementation(() => new Promise(() => undefined))
    render(<Harness onCreate={onCreate} initial="roof" />)
    await pickCreateItem()
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('Фасады'))

    await act(async () => server.reject(new Error('boom')))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Could not save “Фасады”'))
    expect(screen.getByRole('combobox')).toHaveTextContent('Кровля')
    expect(formValue()).toBe('roof')

    // Следующее действие в поле убирает сообщение
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(await screen.findByRole('option', { name: '+ Добавить…' }))
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
  })

  it('O3: с onSettleError встроенного сообщения нет, причина передана', async () => {
    const server = deferred<Created>()
    const onCreate = await createOptimistically(server)
    const onSettleError = vi.fn()
    render(<Harness onCreate={onCreate} onSettleError={onSettleError} />)
    await pickCreateItem()
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('Фасады'))

    await act(async () => server.resolve(null))

    await waitFor(() =>
      expect(onSettleError).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'create',
          reason: 'declined',
          preview: expect.objectContaining({ label: 'Фасады' }),
        }),
      )
    )
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('O2: edit — подпись сразу новая; после ответа с тем же value форма не меняется', async () => {
    const server = deferred<Created>()
    const onUpdate = vi.fn(async (_option: unknown, ctx: { optimistic: (p: { label: string }) => void }) => {
      ctx.optimistic({ label: 'Кровля 2' })
      return server.promise
    })
    render(<Harness onUpdate={onUpdate} initial="roof" />)

    await userEvent.click(screen.getByRole('combobox'))
    const pencil = (await screen.findAllByRole('button', { name: /Edit: Кровля/ }, { hidden: true }))[0]!
    await userEvent.click(pencil)

    await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('Кровля 2'))
    expect(formValue()).toBe('roof')

    await act(async () => server.resolve({ label: 'Кровля 2', value: 'roof' }))
    expect(formValue()).toBe('roof')
    expect(screen.getByRole('combobox')).toHaveTextContent('Кровля 2')
  })

  it('O11: pending-опция приложения приглушена, не выбирается и без карандаша', async () => {
    const onUpdate = vi.fn()
    render(
      <Harness
        onUpdate={onUpdate}
        options={[{ label: 'Кровля', value: 'roof' }, { label: 'Новая', value: 'tmp', pending: true }]}
        initial="roof"
      />,
    )
    await userEvent.click(screen.getByRole('combobox'))
    const pending = await screen.findByRole('option', { name: /Новая/ })
    expect(pending).toHaveAttribute('data-pending')
    expect(pending).toHaveAttribute('aria-disabled', 'true')
    expect(pending.querySelector('button')).toBeNull() // карандаша нет

    await userEvent.click(pending)
    expect(formValue()).toBe('roof')
    expect(screen.getByRole('combobox')).toHaveTextContent('Кровля')
  })
})
