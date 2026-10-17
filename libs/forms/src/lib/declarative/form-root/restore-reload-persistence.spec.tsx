import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Form } from '../'

const key = 'restore-form-reload'
const storageKey = `form-persistence:${key}`
const initial = { title: 'Серверное название', text: 'Серверный текст' }
const draft = { title: 'Мой черновик', text: 'Новая строфа' }

function renderForm(onSubmit = vi.fn().mockResolvedValue(undefined), debounceMs = 0) {
  return render(
    <ChakraProvider value={defaultSystem}>
      <Form initialValue={initial} onSubmit={onSubmit} persistence={{ key, debounceMs }}>
        <Form.Field.String name="title" label="Название" />
        <Form.Field.Textarea name="text" label="Текст" />
        <Form.Button.Submit>Сохранить</Form.Button.Submit>
      </Form>
    </ChakraProvider>,
  )
}

describe('Form — восстановленный черновик остаётся несохранённой копией', () => {
  beforeEach(() => {
    // JSDOM не рассчитывает layout: focus-trap иначе считает все кнопки невидимыми.
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue({
      0: new DOMRect(0, 0, 100, 30),
      length: 1,
      item: () => new DOMRect(0, 0, 100, 30),
      [Symbol.iterator]: function*() {
        yield new DOMRect(0, 0, 100, 30)
      },
    })
    localStorage.clear()
    localStorage.setItem(storageKey, JSON.stringify({ data: draft, savedAt: Date.now(), version: 1 }))
  })
  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('восстанавливает оба поля повторно, не зацикливает эффекты и очищает копию после submit', async () => {
    const user = userEvent.setup()
    const first = renderForm()
    await user.click(await screen.findByRole('button', { name: 'Восстановить', exact: true }))
    await waitFor(() => {
      expect(screen.getByLabelText('Название')).toHaveValue(draft.title)
    })
    expect(screen.getByLabelText('Текст')).toHaveValue(draft.text)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    first.unmount()
    expect(JSON.parse(localStorage.getItem(storageKey) ?? '{}').data).toEqual(draft)

    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const second = renderForm(onSubmit)
    await user.click(await screen.findByRole('button', { name: 'Восстановить', exact: true }))
    await user.click(screen.getByRole('button', { name: 'Сохранить', exact: true }))
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled()
    })
    expect(localStorage.getItem(storageKey)).toBeNull()
    second.unmount()
    expect(localStorage.getItem(storageKey)).toBeNull()
  })

  it('Escape не стирает копию, явный отказ удаляет её', async () => {
    const user = userEvent.setup()
    renderForm()
    await screen.findByRole('dialog')
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Восстановить', exact: true })).toHaveFocus()
    })
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toBeVisible()
    expect(JSON.parse(localStorage.getItem(storageKey) ?? '{}').data).toEqual(draft)
    await user.click(screen.getByRole('button', { name: 'Начать заново', exact: true }))
    await waitFor(() => {
      expect(localStorage.getItem(storageKey)).toBeNull()
    })
    expect(screen.getByLabelText('Название')).toHaveValue(initial.title)
  })

  it('возврат к исходному значению до debounce отменяет pending запись перед unmount', async () => {
    localStorage.clear()
    const user = userEvent.setup()
    const form = renderForm(undefined, 60_000)
    await user.type(screen.getByLabelText('Название'), '!')
    expect(localStorage.getItem(storageKey)).toBeNull()
    await user.keyboard('{Backspace}')
    form.unmount()
    expect(localStorage.getItem(storageKey)).toBeNull()
  })

  it('Enter после открытия восстанавливает копию, не удаляя и не отправляя её', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderForm(onSubmit)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Восстановить', exact: true })).toHaveFocus()
    })
    await user.keyboard('{Enter}')
    await waitFor(() => {
      expect(screen.getByLabelText('Название')).toHaveValue(draft.title)
    })
    expect(JSON.parse(localStorage.getItem(storageKey) ?? '{}').data).toEqual(draft)
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
