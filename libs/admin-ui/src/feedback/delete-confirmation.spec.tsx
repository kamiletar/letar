import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { DeleteConfirmation } from './delete-confirmation'

/** Обёртка с Chakra-провайдером — Dialog требует системы токенов */
function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('DeleteConfirmation', () => {
  it('рендерит триггер и не открывает диалог по умолчанию', () => {
    renderWithProvider(
      <DeleteConfirmation itemName="Товар «Мандала Солнца»" onConfirm={vi.fn()}>
        <button type="button">Удалить</button>
      </DeleteConfirmation>,
    )

    expect(screen.getByRole('button', { name: 'Удалить' })).toBeInTheDocument()
    expect(screen.queryByText(/Подтверждение удаления/)).not.toBeInTheDocument()
  })

  it('открывает диалог с именем удаляемого объекта при клике на триггер', async () => {
    const user = userEvent.setup()
    renderWithProvider(
      <DeleteConfirmation itemName="Товар «Мандала Солнца»" onConfirm={vi.fn()}>
        <button type="button">Удалить</button>
      </DeleteConfirmation>,
    )

    await user.click(screen.getByRole('button', { name: 'Удалить' }))

    expect(await screen.findByText(/Подтверждение удаления/)).toBeInTheDocument()
    expect(screen.getByText('Товар «Мандала Солнца»')).toBeInTheDocument()
    expect(screen.getByText(/Это действие нельзя отменить/)).toBeInTheDocument()
  })

  it('вызывает onConfirm и закрывает диалог после подтверждения', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    renderWithProvider(
      <DeleteConfirmation itemName="Тестовый объект" onConfirm={onConfirm}>
        <button type="button">Удалить</button>
      </DeleteConfirmation>,
    )

    await user.click(screen.getByRole('button', { name: 'Удалить' }))
    await screen.findByText(/Подтверждение удаления/)

    await user.click(screen.getByRole('button', { name: 'Удалить' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('закрывает диалог по кнопке «Отмена» без вызова onConfirm', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    renderWithProvider(
      <DeleteConfirmation itemName="Тестовый объект" onConfirm={onConfirm}>
        <button type="button">Удалить</button>
      </DeleteConfirmation>,
    )

    await user.click(screen.getByRole('button', { name: 'Удалить' }))
    await screen.findByText(/Подтверждение удаления/)

    await user.click(screen.getByRole('button', { name: 'Отмена' }))

    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('переводит кнопку удаления в состояние loading, пока onConfirm выполняется', async () => {
    const user = userEvent.setup()
    let resolveConfirm: () => void = () => {}
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveConfirm = resolve
        }),
    )

    renderWithProvider(
      <DeleteConfirmation itemName="Тестовый объект" onConfirm={onConfirm}>
        <button type="button">Удалить</button>
      </DeleteConfirmation>,
    )

    await user.click(screen.getByRole('button', { name: 'Удалить' }))
    await screen.findByText(/Подтверждение удаления/)

    const confirmButtons = screen.getAllByRole('button', { name: 'Удалить' })
    const confirmButton = confirmButtons[confirmButtons.length - 1]
    await user.click(confirmButton)

    expect(screen.getByRole('button', { name: 'Отмена' })).toBeDisabled()

    resolveConfirm()
  })
})
