import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { BulkAction } from '../types'
import { BulkActionsBar, commonBulkActions } from './bulk-actions-bar'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('BulkActionsBar', () => {
  it('не рендерит ничего, когда ничего не выбрано', () => {
    const { container } = renderWithProvider(
      <BulkActionsBar selectedCount={0} selectedIds={[]} actions={[]} onClear={vi.fn()} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('показывает количество выбранных элементов', () => {
    renderWithProvider(
      <BulkActionsBar selectedCount={3} selectedIds={['1', '2', '3']} actions={[]} onClear={vi.fn()} />,
    )

    expect(screen.getByText('Выбрано: 3')).toBeInTheDocument()
  })

  it('вызывает onClear при клике «Отменить»', async () => {
    const user = userEvent.setup()
    const onClear = vi.fn()

    renderWithProvider(
      <BulkActionsBar selectedCount={2} selectedIds={['1', '2']} actions={[]} onClear={onClear} />,
    )

    await user.click(screen.getByRole('button', { name: /Отменить/ }))

    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('рендерит переданные действия по их label', () => {
    const actions: BulkAction[] = [
      { key: 'publish', label: 'Опубликовать', onClick: vi.fn().mockResolvedValue(undefined) },
      { key: 'delete', label: 'Удалить', onClick: vi.fn().mockResolvedValue(undefined) },
    ]

    renderWithProvider(
      <BulkActionsBar selectedCount={1} selectedIds={['1']} actions={actions} onClear={vi.fn()} />,
    )

    expect(screen.getByRole('button', { name: /Опубликовать/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Удалить/ })).toBeInTheDocument()
  })

  it('выполняет действие без подтверждения сразу и очищает выбор', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn().mockResolvedValue(undefined)
    const onClear = vi.fn()
    const actions: BulkAction[] = [{ key: 'publish', label: 'Опубликовать', onClick }]

    renderWithProvider(
      <BulkActionsBar selectedCount={2} selectedIds={['1', '2']} actions={actions} onClear={onClear} />,
    )

    await user.click(screen.getByRole('button', { name: /Опубликовать/ }))

    await vi.waitFor(() => {
      expect(onClick).toHaveBeenCalledWith(['1', '2'])
      expect(onClear).toHaveBeenCalledTimes(1)
    })
  })

  it('поддерживает onExecute как альтернативу onClick', async () => {
    const user = userEvent.setup()
    const onExecute = vi.fn().mockResolvedValue(undefined)
    const actions: BulkAction[] = [{ key: 'publish', label: 'Опубликовать', onExecute }]

    renderWithProvider(
      <BulkActionsBar selectedCount={1} selectedIds={['1']} actions={actions} onClear={vi.fn()} />,
    )

    await user.click(screen.getByRole('button', { name: /Опубликовать/ }))

    await vi.waitFor(() => {
      expect(onExecute).toHaveBeenCalledWith(['1'])
    })
  })

  it('действие с requiresConfirmation открывает диалог подтверждения вместо немедленного выполнения', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn().mockResolvedValue(undefined)
    const actions: BulkAction[] = [
      { key: 'delete', label: 'Удалить', onClick, requiresConfirmation: true },
    ]

    renderWithProvider(
      <BulkActionsBar selectedCount={2} selectedIds={['1', '2']} actions={actions} onClear={vi.fn()} />,
    )

    await user.click(screen.getByRole('button', { name: /Удалить/ }))

    expect(await screen.findByText('Подтверждение удаления')).toBeInTheDocument()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('подтверждение диалога выполняет действие и закрывает диалог', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn().mockResolvedValue(undefined)
    const onClear = vi.fn()
    const actions: BulkAction[] = [
      { key: 'delete', label: 'Удалить', onClick, requiresConfirmation: true },
    ]

    renderWithProvider(
      <BulkActionsBar selectedCount={2} selectedIds={['1', '2']} actions={actions} onClear={onClear} />,
    )

    await user.click(screen.getByRole('button', { name: /Удалить/ }))
    await screen.findByText('Подтверждение удаления')

    // в диалоге две кнопки «Удалить» — берём последнюю (внутри Dialog.Footer)
    const dialogDeleteButtons = screen.getAllByRole('button', { name: /Удалить/ })
    await user.click(dialogDeleteButtons[dialogDeleteButtons.length - 1])

    await vi.waitFor(() => {
      expect(onClick).toHaveBeenCalledWith(['1', '2'])
      expect(onClear).toHaveBeenCalledTimes(1)
    })
  })

  it('отмена диалога не выполняет действие', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn().mockResolvedValue(undefined)
    const actions: BulkAction[] = [
      { key: 'delete', label: 'Удалить', onClick, requiresConfirmation: true },
    ]

    renderWithProvider(
      <BulkActionsBar selectedCount={1} selectedIds={['1']} actions={actions} onClear={vi.fn()} />,
    )

    await user.click(screen.getByRole('button', { name: /Удалить/ }))
    await screen.findByText('Подтверждение удаления')

    await user.click(screen.getByRole('button', { name: 'Отмена' }))

    expect(onClick).not.toHaveBeenCalled()
    // Dialog размонтируется по завершении exit-анимации (zag.js) — не синхронно с click
    await vi.waitFor(() => {
      expect(screen.queryByText('Подтверждение удаления')).not.toBeInTheDocument()
    })
  })
})

describe('commonBulkActions', () => {
  it('publish создаёт action с зелёной палитрой и без подтверждения', () => {
    const onClick = vi.fn()
    const action = commonBulkActions.publish(onClick)

    expect(action.key).toBe('publish')
    expect(action.label).toBe('Опубликовать')
    expect(action.colorPalette).toBe('green')
    expect(action.requiresConfirmation).toBeUndefined()
    expect(action.onClick).toBe(onClick)
  })

  it('unpublish создаёт action с серой палитрой', () => {
    const onClick = vi.fn()
    const action = commonBulkActions.unpublish(onClick)

    expect(action.key).toBe('unpublish')
    expect(action.colorPalette).toBe('gray')
  })

  it('delete создаёт action с requiresConfirmation=true и красной палитрой', () => {
    const onClick = vi.fn()
    const action = commonBulkActions.delete(onClick)

    expect(action.key).toBe('delete')
    expect(action.colorPalette).toBe('red')
    expect(action.requiresConfirmation).toBe(true)
  })
})
