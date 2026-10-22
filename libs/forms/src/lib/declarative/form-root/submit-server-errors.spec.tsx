import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { actionFailure, applyServerErrors, mapServerErrors, unwrapActionResult } from '@letar/forms-core/server-errors'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ReactNode, useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDeclarativeForm } from '../form-context'
import { FormErrors } from '../form-errors'
import { FieldString } from '../form-fields'
import type { DeclarativeFormContextValue } from '../types'
import * as useFormApiModule from '../use-form-api'
import { FormSimple } from './form-simple'
import { FormWithApi } from './form-with-api'

const STORAGE_KEY = 'form-persistence:submit-server-errors'

function TestWrapper({ children }: { children: ReactNode }) {
  return <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
}

describe.each(['simple', 'api'] as const)('отказы отправки: %s', (kind) => {
  let context: DeclarativeFormContextValue

  function CaptureForm() {
    const currentContext = useDeclarativeForm()
    useEffect(() => {
      context = currentContext
    }, [currentContext])
    return null
  }

  function TestForm({ onSubmit, afterSuccess, onError }: {
    onSubmit: (data: { title: string }) => void | Promise<void>
    afterSuccess?: () => void
    onError?: (error: Error) => void
  }) {
    const props = {
      initialValue: { title: '' },
      onSubmit,
      persistence: { key: 'submit-server-errors', debounceMs: 0 },
      middleware: { afterSuccess, onError },
      children: (
        <>
          <CaptureForm />
          <FieldString name="title" label="Название" />
          <FormErrors />
          <button type="submit">Сохранить</button>
        </>
      ),
    }
    return kind === 'simple' ? <FormSimple {...props} /> : (
      <FormWithApi
        {...props}
        api={{
          query: { hook: vi.fn() },
          mutations: { create: vi.fn(), update: vi.fn() },
        }}
      />
    )
  }

  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(useFormApiModule, 'useFormApi').mockReturnValue({
      isEditMode: false,
      isLoading: false,
      isMutating: false,
      data: null,
      error: null,
      mutationError: null,
      submit: vi.fn().mockResolvedValue(undefined),
    })
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('показывает отказ Server Action без middleware, сохраняет правки и черновик; повторный успех очищает их', async () => {
    const user = userEvent.setup()
    const afterSuccess = vi.fn()
    const onSubmit = vi.fn()
      .mockImplementationOnce(() => unwrapActionResult(actionFailure('Строфа слишком длинная')))
      .mockResolvedValue(undefined)
    render(<TestForm onSubmit={onSubmit} afterSuccess={afterSuccess} />, { wrapper: TestWrapper })

    await user.type(screen.getByLabelText('Название'), 'Доверие')
    await waitFor(() => expect(localStorage.getItem(STORAGE_KEY)).toContain('Доверие'))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(await screen.findByText('Строфа слишком длинная')).toBeVisible()
    expect(screen.getByLabelText('Название')).toHaveValue('Доверие')
    expect(context.form.state.isDirty).toBe(true)
    expect(context.form.state.isSubmitSuccessful).toBe(false)
    expect(localStorage.getItem(STORAGE_KEY)).toContain('Доверие')
    expect(afterSuccess).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    await waitFor(() => expect(afterSuccess).toHaveBeenCalledOnce())
    expect(screen.queryByText('Строфа слишком длинная')).not.toBeInTheDocument()
    expect(context.form.state.isDirty).toBe(false)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('показывает серверную ошибку у поля и сохраняет onError', async () => {
    const user = userEvent.setup()
    const onError = vi.fn()
    render(
      <TestForm
        onSubmit={() => {
          unwrapActionResult(actionFailure('Это название уже занято', 'title'))
        }}
        onError={onError}
      />,
      { wrapper: TestWrapper },
    )

    await user.type(screen.getByLabelText('Название'), 'Доверие')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect((await screen.findAllByText('Это название уже занято'))[0]).toBeVisible()
    expect(context.form.getFieldMeta('title').errorMap.onServer).toBe('Это название уже занято')
    expect(onError).toHaveBeenCalledOnce()
  })

  it('программная отправка отклоняется исходной ошибкой после её отображения', async () => {
    const error = new Error('Сервис временно недоступен')
    render(
      <TestForm
        onSubmit={() => {
          throw error
        }}
      />,
      { wrapper: TestWrapper },
    )

    await act(async () => {
      await expect(context.submit?.()).rejects.toBe(error)
    })

    expect(screen.getByText(error.message)).toBeVisible()
    expect(context.form.state.isSubmitSuccessful).toBe(false)
  })

  it('сохраняет кастомный mapping, уже применённый обработчиком отправки', async () => {
    const error = { code: 'P2002', meta: { target: ['name'] } }
    render(
      <TestForm
        onSubmit={() => {
          applyServerErrors(
            context.form,
            mapServerErrors(error, {
              fieldMap: { name: { field: 'title', message: 'Выберите другое название' } },
            }),
          )
          throw error
        }}
      />,
      { wrapper: TestWrapper },
    )

    await act(async () => {
      await expect(context.submit?.()).rejects.toBe(error)
    })

    expect(context.form.getFieldMeta('title').errorMap.onServer).toBe('Выберите другое название')
    expect(context.form.getFieldMeta('name')?.errorMap.onServer).toBeUndefined()
  })

  it('заменяет ошибку поля новым отказом при повторной попытке без правки текста', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
      .mockImplementationOnce(() => unwrapActionResult(actionFailure('Старый отказ', 'title')))
      .mockImplementationOnce(() => unwrapActionResult(actionFailure('Новый отказ')))
    render(<TestForm onSubmit={onSubmit} />, { wrapper: TestWrapper })
    await user.type(screen.getByLabelText('Название'), 'Доверие')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    await screen.findAllByText('Старый отказ')

    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(await screen.findByText('Новый отказ')).toBeVisible()
    expect(screen.queryByText('Старый отказ')).not.toBeInTheDocument()
    expect(onSubmit).toHaveBeenCalledTimes(2)
  })
})
