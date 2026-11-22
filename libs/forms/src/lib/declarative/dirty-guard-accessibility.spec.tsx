import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod/v4'
import { createForm } from './create-form'
import { DirtyGuard } from './dirty-guard'
import { DeclarativeFormContext } from './form-context'
import type { DeclarativeFormContextValue } from './types'

const GuardedForm = createForm({ dirtyGuard: true })
const Schema = z.object({ title: z.string().min(1) }).strip()

describe('DirtyGuard: доступный диалог', () => {
  function renderWithoutChakra() {
    const context = {
      form: { state: { isDirty: true }, reset: vi.fn() },
    } as unknown as DeclarativeFormContextValue
    const content = (guard = true) => (
      <DeclarativeFormContext.Provider value={context}>
        {guard && <DirtyGuard />}
        <a href="/other">Уйти со страницы</a>
        <button type="button">За пределами окна</button>
        <input aria-label="Другое поле" />
      </DeclarativeFormContext.Provider>
    )
    const view = render(content())
    return { ...view, hideGuard: () => view.rerender(content(false)) }
  }

  it('без Chakra связывает заголовок и описание, фокусирует безопасное действие и замыкает Tab', async () => {
    const user = userEvent.setup()
    renderWithoutChakra()
    await user.click(screen.getByRole('link'))

    const dialog = screen.getByRole('dialog', { name: 'Unsaved changes' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleDescription('You have unsaved changes. Are you sure you want to leave this page?')
    const stay = screen.getByRole('button', { name: 'Stay' })
    const leave = screen.getByRole('button', { name: 'Leave' })
    expect(stay).toHaveFocus()
    await user.tab({ shift: true })
    expect(leave).toHaveFocus()
    await user.tab()
    expect(stay).toHaveFocus()
    await user.tab()
    expect(leave).toHaveFocus()

    screen.getByRole('button', { name: 'За пределами окна' }).focus()
    expect(stay).toHaveFocus()
  })

  it('Escape отменяет уход, возвращает фокус к ссылке и сохраняет защиту beforeunload', async () => {
    const user = userEvent.setup()
    renderWithoutChakra()
    const link = screen.getByRole('link')
    const navigate = vi.fn((event: Event) => event.preventDefault())
    link.addEventListener('click', navigate)
    await user.click(link)
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(link).toHaveFocus()
    expect(navigate).not.toHaveBeenCalled()
    const unload = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(unload)
    expect(unload.defaultPrevented).toBe(true)

    await user.keyboard('{Enter}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Stay' }))
    expect(link).toHaveFocus()
  })

  it('при размонтировании открытого guard возвращает фокус и снимает перехват клавиатуры', async () => {
    const user = userEvent.setup()
    const view = renderWithoutChakra()
    const link = screen.getByRole('link')
    await user.click(link)
    view.hideGuard()
    expect(link).toHaveFocus()
    screen.getByRole('button', { name: 'За пределами окна' }).focus()
    expect(screen.getByRole('button', { name: 'За пределами окна' })).toHaveFocus()
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    document.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })

  it('возвращает фокус инициатору, даже если браузер не фокусирует ссылку при клике мышью', () => {
    renderWithoutChakra()
    screen.getByRole('textbox').focus()
    const link = screen.getByRole('link')
    fireEvent.click(link)
    expect(screen.getByRole('button', { name: 'Stay' })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Stay' }))
    expect(link).toHaveFocus()
  })
})

describe('DirtyGuard внутри валидной формы', () => {
  it.each(['Stay', 'Leave'] as const)(
    '%s не запускает submit, а отдельная кнопка сохранения работает',
    async (action) => {
      const user = userEvent.setup()
      const save = vi.fn()
      const navigate = vi.fn((event: Event) => event.preventDefault())
      render(
        <ChakraProvider value={defaultSystem}>
          <GuardedForm schema={Schema} initialValue={{ title: 'Исходный текст' }} onSubmit={save}>
            <GuardedForm.Field.String name="title" />
            <a href="/other">Уйти со страницы</a>
            <GuardedForm.Button.Submit>Сохранить</GuardedForm.Button.Submit>
          </GuardedForm>
        </ChakraProvider>,
      )
      const input = screen.getByRole('textbox')
      await user.type(input, '!')
      const link = screen.getByRole('link')
      link.addEventListener('click', navigate)
      await user.click(link)
      const button = screen.getByRole('button', { name: action })
      expect(button.closest('form')).not.toBeNull()
      await user.click(button)

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(save).not.toHaveBeenCalled()
      expect(navigate).toHaveBeenCalledTimes(action === 'Leave' ? 1 : 0)
      expect(input).toHaveValue(action === 'Leave' ? 'Исходный текст' : 'Исходный текст!')

      await user.type(input, '?')
      fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
      await waitFor(() => expect(save).toHaveBeenCalledTimes(1))
    },
  )
})
