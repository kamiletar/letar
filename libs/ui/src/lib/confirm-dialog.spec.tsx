import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog, DeleteConfirmDialog, TriggerConfirmDialog, useConfirmDialog } from './confirm-dialog'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('ConfirmDialog', () => {
  it('не рендерит контент, когда isOpen=false', () => {
    renderWithProvider(
      <ConfirmDialog isOpen={false} onClose={vi.fn()} onConfirm={vi.fn()} title="Удалить запись?" />,
    )
    expect(screen.queryByText('Удалить запись?')).not.toBeInTheDocument()
  })

  it('рендерит заголовок и описание, когда isOpen=true', async () => {
    renderWithProvider(
      <ConfirmDialog
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Удалить запись?"
        description="Это действие нельзя отменить."
      />,
    )
    expect(await screen.findByText('Удалить запись?')).toBeInTheDocument()
    expect(screen.getByText('Это действие нельзя отменить.')).toBeInTheDocument()
  })

  it('вызывает onClose при клике на кнопку отмены', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderWithProvider(
      <ConfirmDialog isOpen onClose={onClose} onConfirm={vi.fn()} title="Удалить?" cancelText="Отмена" />,
    )
    const cancelButton = await screen.findByRole('button', { name: 'Отмена' })
    await user.click(cancelButton)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('вызывает onConfirm и затем onClose при подтверждении (closeOnConfirm по умолчанию)', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onConfirm = vi.fn()
    renderWithProvider(
      <ConfirmDialog isOpen onClose={onClose} onConfirm={onConfirm} title="Удалить?" confirmText="Удалить" />,
    )
    const confirmButton = await screen.findByRole('button', { name: 'Удалить' })
    await user.click(confirmButton)
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('не вызывает onClose при closeOnConfirm=false', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onConfirm = vi.fn()
    renderWithProvider(
      <ConfirmDialog
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        title="Удалить?"
        confirmText="Удалить"
        closeOnConfirm={false}
      />,
    )
    const confirmButton = await screen.findByRole('button', { name: 'Удалить' })
    await user.click(confirmButton)
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('рендерит иконку для варианта danger', async () => {
    renderWithProvider(
      <ConfirmDialog isOpen onClose={vi.fn()} onConfirm={vi.fn()} title="Удалить?" variant="danger" />,
    )
    const title = await screen.findByText('Удалить?')
    expect(title).toBeInTheDocument()
  })
})

describe('TriggerConfirmDialog', () => {
  it('открывает диалог по клику на trigger', async () => {
    const user = userEvent.setup()
    renderWithProvider(
      <TriggerConfirmDialog
        trigger={<button type="button">Удалить</button>}
        title="Удалить контейнер?"
        description="Это действие нельзя отменить."
        onConfirm={vi.fn()}
      />,
    )
    expect(screen.queryByText('Удалить контейнер?')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Удалить' }))
    expect(await screen.findByText('Удалить контейнер?')).toBeInTheDocument()
  })

  it('вызывает async onConfirm и закрывает диалог после успеха', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    renderWithProvider(
      <TriggerConfirmDialog
        trigger={<button type="button">Открыть</button>}
        title="Подтвердить?"
        description="Описание"
        onConfirm={onConfirm}
        confirmText="Да"
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Открыть' }))
    const confirmButton = await screen.findByRole('button', { name: 'Да' })
    await user.click(confirmButton)
    expect(onConfirm).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(screen.queryByText('Подтвердить?')).not.toBeInTheDocument()
    })
  })
})

describe('DeleteConfirmDialog', () => {
  it('формирует заголовок и описание из resourceName', async () => {
    const user = userEvent.setup()
    renderWithProvider(
      <DeleteConfirmDialog
        trigger={<button type="button">Удалить</button>}
        resourceName="Занятие"
        onConfirm={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Удалить' }))
    expect(await screen.findByText('Удалить Занятие?')).toBeInTheDocument()
  })
})

describe('useConfirmDialog', () => {
  it('открывает и закрывает диалог, хранит data', () => {
    const { result } = renderHook(() => useConfirmDialog<{ id: string }>())

    expect(result.current.isOpen).toBe(false)
    expect(result.current.data).toBeNull()

    act(() => {
      result.current.open({ id: 'lesson-123' })
    })
    expect(result.current.isOpen).toBe(true)
    expect(result.current.data).toEqual({ id: 'lesson-123' })

    act(() => {
      result.current.close()
    })
    expect(result.current.isOpen).toBe(false)
    expect(result.current.data).toBeNull()
  })
})
