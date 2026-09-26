import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { DeclarativeFormContext } from './form-context'
import {
  useCreatePendingRegistry,
  useFormPendingRegistry,
  useFormPendingSnapshot,
  useFormPendingSubmit,
  useFormSubmit,
} from './form-pending'

/** То, что делает корень формы: реестр + submit */
function useRoot(form: { handleSubmit: () => unknown }) {
  const pending = useCreatePendingRegistry()
  const submit = useFormPendingSubmit(pending, form)
  return { pending, submit }
}

describe('form-pending', () => {
  it('useFormPendingSubmit: реестр пуст — handleSubmit в том же тике; не пуст — после подтверждения', async () => {
    const form = { handleSubmit: vi.fn().mockResolvedValue(undefined) }
    const { result } = renderHook(() => useRoot(form))

    void result.current.submit()
    expect(form.handleSubmit).toHaveBeenCalledTimes(1)

    let confirm!: (ok: boolean) => void
    result.current.pending.add(new Promise<boolean>((resolve) => (confirm = resolve)))
    const queued = result.current.submit()
    expect(form.handleSubmit).toHaveBeenCalledTimes(1)
    confirm(true)
    await queued
    expect(form.handleSubmit).toHaveBeenCalledTimes(2)
  })

  it('useFormPendingSnapshot/Registry: вне формы — пусто и null; в форме подписан на реестр', () => {
    const outside = renderHook(() => ({ registry: useFormPendingRegistry(), snapshot: useFormPendingSnapshot() }))
    expect(outside.result.current.registry).toBeNull()
    expect(outside.result.current.snapshot).toEqual({ count: 0, submitQueued: false })

    const form = { handleSubmit: vi.fn() }
    const root = renderHook(() => useRoot(form))
    const wrapper = ({ children }: { children: ReactNode }) => (
      <DeclarativeFormContext.Provider value={{ form, pending: root.result.current.pending }}>
        {children}
      </DeclarativeFormContext.Provider>
    )
    const inside = renderHook(() => useFormPendingSnapshot(), { wrapper })
    act(() => {
      root.result.current.pending.add(new Promise<boolean>(() => undefined))
    })
    expect(inside.result.current.count).toBe(1)
  })

  it('useFormSubmit: без submit в контексте — прямой handleSubmit, с ним — через него', async () => {
    const form = { handleSubmit: vi.fn().mockResolvedValue(undefined) }
    const direct = renderHook(() => useFormSubmit(form))
    await direct.result.current()
    expect(form.handleSubmit).toHaveBeenCalledTimes(1)

    const submit = vi.fn().mockResolvedValue(undefined)
    const wrapper = ({ children }: { children: ReactNode }) => (
      <DeclarativeFormContext.Provider value={{ form, submit }}>{children}</DeclarativeFormContext.Provider>
    )
    const viaContext = renderHook(() => useFormSubmit(form), { wrapper })
    await viaContext.result.current()
    expect(submit).toHaveBeenCalledTimes(1)
    expect(form.handleSubmit).toHaveBeenCalledTimes(1)
  })
})
