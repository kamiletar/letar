import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod/v4'
import { DeclarativeFormContext } from '../../form-context'
import type { DeclarativeFormContextValue } from '../../types'
import { useResolvedFieldProps } from './use-resolved-field-props'

// Обёртка для тестов с Chakra UI
const TestWrapper = ({ children }: { children: ReactNode }) =>
  createElement(ChakraProvider, { value: defaultSystem }, children)

// Создаём мок контекста формы
function createMockFormContext(
  schema?: z.ZodType,
  options?: { disabled?: boolean; readOnly?: boolean },
): DeclarativeFormContextValue {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form: { Field: vi.fn() } as any,
    schema,
    disabled: options?.disabled,
    readOnly: options?.readOnly,
  }
}

// Обёртка с контекстом формы
function createContextWrapper(context: DeclarativeFormContextValue) {
  return ({ children }: { children: ReactNode }) =>
    createElement(TestWrapper, null, createElement(DeclarativeFormContext.Provider, { value: context }, children))
}

describe('useResolvedFieldProps', () => {
  describe('label resolution', () => {
    it('использует label из props', async () => {
      const context = createMockFormContext()
      const wrapper = createContextWrapper(context)

      const { result } = renderHook(() => useResolvedFieldProps('name', { label: 'Имя из props' }), { wrapper })

      await waitFor(() => {
        expect(result.current.label).toBe('Имя из props')
      })
    })

    it('использует title из schema meta если label не указан', async () => {
      const Schema = z.object({
        email: z.string().meta({ ui: { title: 'Email адрес' } }),
      })
      const context = createMockFormContext(Schema)
      const wrapper = createContextWrapper(context)

      const { result } = renderHook(() => useResolvedFieldProps('email', {}), { wrapper })

      await waitFor(() => {
        expect(result.current.label).toBe('Email адрес')
      })
    })

    it('props label имеет приоритет над schema meta', async () => {
      const Schema = z.object({
        email: z.string().meta({ ui: { title: 'Из схемы' } }),
      })
      const context = createMockFormContext(Schema)
      const wrapper = createContextWrapper(context)

      const { result } = renderHook(() => useResolvedFieldProps('email', { label: 'Из props' }), { wrapper })

      await waitFor(() => {
        expect(result.current.label).toBe('Из props')
      })
    })
  })

  describe('placeholder resolution', () => {
    it('использует placeholder из props', async () => {
      const context = createMockFormContext()
      const wrapper = createContextWrapper(context)

      const { result } = renderHook(() => useResolvedFieldProps('name', { placeholder: 'Введите имя' }), { wrapper })

      await waitFor(() => {
        expect(result.current.placeholder).toBe('Введите имя')
      })
    })

    it('использует placeholder из schema meta', async () => {
      const Schema = z.object({
        name: z.string().meta({ ui: { placeholder: 'Placeholder из схемы' } }),
      })
      const context = createMockFormContext(Schema)
      const wrapper = createContextWrapper(context)

      const { result } = renderHook(() => useResolvedFieldProps('name', {}), { wrapper })

      await waitFor(() => {
        expect(result.current.placeholder).toBe('Placeholder из схемы')
      })
    })
  })

  describe('helperText resolution', () => {
    it('использует helperText из props', async () => {
      const context = createMockFormContext()
      const wrapper = createContextWrapper(context)

      const { result } = renderHook(() => useResolvedFieldProps('name', { helperText: 'Подсказка из props' }), {
        wrapper,
      })

      await waitFor(() => {
        expect(result.current.helperText).toBe('Подсказка из props')
      })
    })

    it('использует description из schema meta если helperText не указан', async () => {
      const Schema = z.object({
        email: z.string().meta({ ui: { description: 'Описание из схемы' } }),
      })
      const context = createMockFormContext(Schema)
      const wrapper = createContextWrapper(context)

      const { result } = renderHook(() => useResolvedFieldProps('email', {}), { wrapper })

      await waitFor(() => {
        expect(result.current.helperText).toBe('Описание из схемы')
      })
    })

    it('генерирует автоматическую подсказку из constraints', async () => {
      const Schema = z.object({
        password: z.string().min(8).max(100),
      })
      const context = createMockFormContext(Schema)
      const wrapper = createContextWrapper(context)

      const { result } = renderHook(() => useResolvedFieldProps('password', {}), { wrapper })

      await waitFor(() => {
        // Должна быть автоматически сгенерированная подсказка
        expect(result.current.helperText).toBeDefined()
        expect(typeof result.current.helperText).toBe('string')
      })
    })
  })

  describe('required resolution', () => {
    it('использует required из props', async () => {
      const context = createMockFormContext()
      const wrapper = createContextWrapper(context)

      const { result } = renderHook(() => useResolvedFieldProps('name', { required: true }), { wrapper })

      await waitFor(() => {
        expect(result.current.required).toBe(true)
      })
    })

    it('определяет required из схемы (non-optional field)', async () => {
      const Schema = z.object({
        email: z.string(), // обязательное поле
        nickname: z.string().optional(), // необязательное
      })
      const context = createMockFormContext(Schema)
      const wrapper = createContextWrapper(context)

      const { result: resultEmail } = renderHook(() => useResolvedFieldProps('email', {}), { wrapper })
      const { result: resultNickname } = renderHook(() => useResolvedFieldProps('nickname', {}), { wrapper })

      await waitFor(() => {
        expect(resultEmail.current.required).toBe(true)
        expect(resultNickname.current.required).toBe(false)
      })
    })
  })

  describe('disabled resolution', () => {
    it('использует disabled из props', async () => {
      const context = createMockFormContext()
      const wrapper = createContextWrapper(context)

      const { result } = renderHook(() => useResolvedFieldProps('name', { disabled: true }), { wrapper })

      await waitFor(() => {
        expect(result.current.disabled).toBe(true)
      })
    })

    it('использует disabled из form-level настроек', async () => {
      const context = createMockFormContext(undefined, { disabled: true })
      const wrapper = createContextWrapper(context)

      const { result } = renderHook(() => useResolvedFieldProps('name', {}), { wrapper })

      await waitFor(() => {
        expect(result.current.disabled).toBe(true)
      })
    })

    it('props disabled имеет приоритет над form-level', async () => {
      const context = createMockFormContext(undefined, { disabled: true })
      const wrapper = createContextWrapper(context)

      const { result } = renderHook(() => useResolvedFieldProps('name', { disabled: false }), { wrapper })

      await waitFor(() => {
        expect(result.current.disabled).toBe(false)
      })
    })
  })

  describe('readOnly resolution', () => {
    it('использует readOnly из props', async () => {
      const context = createMockFormContext()
      const wrapper = createContextWrapper(context)

      const { result } = renderHook(() => useResolvedFieldProps('name', { readOnly: true }), { wrapper })

      await waitFor(() => {
        expect(result.current.readOnly).toBe(true)
      })
    })

    it('использует readOnly из form-level настроек', async () => {
      const context = createMockFormContext(undefined, { readOnly: true })
      const wrapper = createContextWrapper(context)

      const { result } = renderHook(() => useResolvedFieldProps('name', {}), { wrapper })

      await waitFor(() => {
        expect(result.current.readOnly).toBe(true)
      })
    })
  })

  describe('constraints extraction', () => {
    it('извлекает string constraints (minLength, maxLength)', async () => {
      const Schema = z.object({
        title: z.string().min(5).max(100),
      })
      const context = createMockFormContext(Schema)
      const wrapper = createContextWrapper(context)

      const { result } = renderHook(() => useResolvedFieldProps('title', {}), { wrapper })

      await waitFor(() => {
        expect(result.current.constraints.string?.minLength).toBe(5)
        expect(result.current.constraints.string?.maxLength).toBe(100)
      })
    })

    it('извлекает number constraints (min, max)', async () => {
      const Schema = z.object({
        age: z.number().min(18).max(120),
      })
      const context = createMockFormContext(Schema)
      const wrapper = createContextWrapper(context)

      const { result } = renderHook(() => useResolvedFieldProps('age', {}), { wrapper })

      await waitFor(() => {
        expect(result.current.constraints.number?.min).toBe(18)
        expect(result.current.constraints.number?.max).toBe(120)
      })
    })

    it('извлекает email inputType для string().email()', async () => {
      const Schema = z.object({
        email: z.string().email(),
      })
      const context = createMockFormContext(Schema)
      const wrapper = createContextWrapper(context)

      const { result } = renderHook(() => useResolvedFieldProps('email', {}), { wrapper })

      await waitFor(() => {
        expect(result.current.constraints.string?.inputType).toBe('email')
      })
    })
  })

  describe('fullPath', () => {
    it('возвращает имя поля как fullPath', async () => {
      const context = createMockFormContext()
      const wrapper = createContextWrapper(context)

      const { result } = renderHook(() => useResolvedFieldProps('username', {}), { wrapper })

      await waitFor(() => {
        expect(result.current.fullPath).toBe('username')
      })
    })
  })
})
