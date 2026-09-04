import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { SensitiveFieldsProvider, useRegisterSensitiveField, useSensitiveFieldPaths } from './sensitive-fields-context'

const wrapper = ({ children }: { children: ReactNode }) => <SensitiveFieldsProvider>{children}</SensitiveFieldsProvider>

describe('SensitiveFieldsProvider registry', () => {
  it('без провайдера регистрация — no-op, список путей пуст', () => {
    const { result } = renderHook(() => {
      useRegisterSensitiveField('apiKey.value', true)
      return useSensitiveFieldPaths()
    })

    expect(result.current).toEqual([])
  })

  it('регистрирует путь при монтировании', () => {
    const { result } = renderHook(
      () => {
        useRegisterSensitiveField('apiKey.value', true)
        return useSensitiveFieldPaths()
      },
      { wrapper },
    )

    expect(result.current).toEqual(['apiKey.value'])
  })

  it('sensitive: false — путь не регистрируется', () => {
    const { result } = renderHook(
      () => {
        useRegisterSensitiveField('apiKey.value', false)
        return useSensitiveFieldPaths()
      },
      { wrapper },
    )

    expect(result.current).toEqual([])
  })

  it('переключение sensitive true → false снимает путь реактивно', () => {
    const { result, rerender } = renderHook(
      ({ sensitive }: { sensitive: boolean }) => {
        useRegisterSensitiveField('apiKey.value', sensitive)
        return useSensitiveFieldPaths()
      },
      { wrapper, initialProps: { sensitive: true } },
    )

    expect(result.current).toEqual(['apiKey.value'])

    act(() => {
      rerender({ sensitive: false })
    })

    expect(result.current).toEqual([])
  })

  it('несколько полей регистрируются независимо', () => {
    const { result } = renderHook(
      () => {
        useRegisterSensitiveField('apiKey.value', true)
        useRegisterSensitiveField('card.cvv', true)
        return useSensitiveFieldPaths()
      },
      { wrapper },
    )

    expect([...result.current].sort()).toEqual(['apiKey.value', 'card.cvv'])
  })

  it('разные экземпляры провайдера изолируют регистрацию друг от друга', () => {
    function useProbe(isSensitive: boolean) {
      useRegisterSensitiveField('apiKey.value', isSensitive)
      return useSensitiveFieldPaths()
    }

    const a = renderHook(() => useProbe(true), { wrapper })
    const b = renderHook(() => useProbe(false), { wrapper })

    expect(a.result.current).toEqual(['apiKey.value'])
    expect(b.result.current).toEqual([])
  })
})
