import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OfflineSensitiveFieldsError } from '../../offline'
import { Form } from '../'

// Сеть пропала; очередь замещаем — смотрим, что в неё пытаются положить (в реальности это IndexedDB)
const { addAction } = vi.hoisted(() => ({ addAction: vi.fn() }))

vi.mock('../../offline/use-offline-status', () => ({ useOfflineStatus: () => true }))
vi.mock('../../offline/use-sync-queue', () => ({
  useSyncQueue: () => ({
    addAction,
    processQueue: vi.fn(),
    pendingCount: 0,
    isProcessing: false,
    queueLength: 0,
  }),
}))

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('offline + чувствительные поля (FM-006)', () => {
  beforeEach(() => {
    addAction.mockReset()
    addAction.mockResolvedValue({ id: 'queued-1' })
  })

  it('секрет EditIntent не попадает в офлайн-очередь, сабмит бросает типизированную ошибку', async () => {
    const user = userEvent.setup()
    const onError = vi.fn()
    const onSyncError = vi.fn()
    const onSubmit = vi.fn()

    render(
      <TestWrapper>
        <Form
          initialValue={{ name: '', apiKey: { isEdited: true, value: '' } }}
          onSubmit={onSubmit}
          offline={{ actionType: 'FORM_SUBMIT', onSyncError }}
          middleware={{ onError }}
        >
          <Form.Field.String name="name" label="Имя" />
          <Form.Field.EditIntent name="apiKey" displayValue="****" emptyValue="">
            <Form.Field.String name="apiKey.value" label="Ключ" />
          </Form.Field.EditIntent>
          <Form.Button.Submit>Отправить</Form.Button.Submit>
        </Form>
      </TestWrapper>,
    )

    await act(async () => {
      await user.type(screen.getByLabelText('Имя'), 'Иван')
      await user.type(screen.getByLabelText('Ключ'), 'sk-real-secret')
      await user.click(screen.getByRole('button', { name: 'Отправить' }))
    })

    // Ничего не ушло в очередь (в том числе остальные поля): секрет не должен лежать в IndexedDB
    expect(addAction).not.toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()

    // Ошибка типизирована: код и класс, не голая строка
    expect(onError).toHaveBeenCalledTimes(1)
    const error = onError.mock.calls[0]![0] as OfflineSensitiveFieldsError
    expect(error).toBeInstanceOf(OfflineSensitiveFieldsError)
    expect(error.code).toBe('sensitive-fields-offline')
    expect(error.message).not.toContain('sk-real-secret')
    expect(onSyncError).toHaveBeenCalledWith(error.message, 'sensitive-fields-offline')
  })

  it('форма без чувствительных полей по-прежнему ставится в очередь', async () => {
    const user = userEvent.setup()
    const onQueued = vi.fn()

    render(
      <TestWrapper>
        <Form initialValue={{ name: '' }} onSubmit={vi.fn()} offline={{ actionType: 'FORM_SUBMIT', onQueued }}>
          <Form.Field.String name="name" label="Имя" />
          <Form.Button.Submit>Отправить</Form.Button.Submit>
        </Form>
      </TestWrapper>,
    )

    await act(async () => {
      await user.type(screen.getByLabelText('Имя'), 'Иван')
      await user.click(screen.getByRole('button', { name: 'Отправить' }))
    })

    expect(addAction).toHaveBeenCalledTimes(1)
    expect(addAction.mock.calls[0]![0]).toMatchObject({ type: 'FORM_SUBMIT', payload: { name: 'Иван' } })
    expect(onQueued).toHaveBeenCalled()
  })
})
