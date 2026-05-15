import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'

import { FormStepsContext, type FormStepsContextValue, useFormStepsContext } from './form-steps-context'

// Создаём мок контекста
function createMockStepsContext(overrides?: Partial<FormStepsContextValue>): FormStepsContextValue {
  return {
    currentStep: 0,
    stepCount: 3,
    steps: [],
    goToNext: async () => true,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    goToPrev: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    goToStep: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    skipToEnd: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    triggerSubmit: () => {},
    canGoNext: true,
    canGoPrev: false,
    isCompleted: false,
    isLastStep: false,
    isFirstStep: true,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    registerStep: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    unregisterStep: () => {},
    validateOnNext: true,
    linear: false,
    orientation: 'horizontal',
    size: 'md',
    variant: 'solid',
    colorPalette: 'brand',
    animated: false,
    animationDuration: 0.3,
    direction: 'forward',
    hiddenFields: new Set(),
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    hideFieldsFromValidation: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    showFieldsForValidation: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    clearStepPersistence: () => {},
    ...overrides,
  }
}

// Wrapper с контекстом
function createContextWrapper(context: FormStepsContextValue) {
  return ({ children }: { children: ReactNode }) =>
    createElement(FormStepsContext.Provider, { value: context }, children)
}

describe('FormStepsContext', () => {
  describe('useFormStepsContext', () => {
    it('выбрасывает ошибку если используется вне Form.Steps', () => {
      // renderHook без провайдера должен выбросить ошибку
      expect(() => {
        renderHook(() => useFormStepsContext())
      }).toThrow('useFormStepsContext must be used inside Form.Steps')
    })

    it('возвращает контекст когда внутри провайдера', () => {
      const context = createMockStepsContext()
      const wrapper = createContextWrapper(context)

      const { result } = renderHook(() => useFormStepsContext(), { wrapper })

      expect(result.current).toBe(context)
    })

    it('возвращает currentStep', () => {
      const context = createMockStepsContext({ currentStep: 2 })
      const wrapper = createContextWrapper(context)

      const { result } = renderHook(() => useFormStepsContext(), { wrapper })

      expect(result.current.currentStep).toBe(2)
    })

    it('возвращает stepCount', () => {
      const context = createMockStepsContext({ stepCount: 5 })
      const wrapper = createContextWrapper(context)

      const { result } = renderHook(() => useFormStepsContext(), { wrapper })

      expect(result.current.stepCount).toBe(5)
    })

    it('возвращает isFirstStep/isLastStep', () => {
      const context = createMockStepsContext({
        isFirstStep: true,
        isLastStep: false,
      })
      const wrapper = createContextWrapper(context)

      const { result } = renderHook(() => useFormStepsContext(), { wrapper })

      expect(result.current.isFirstStep).toBe(true)
      expect(result.current.isLastStep).toBe(false)
    })

    it('возвращает canGoNext/canGoPrev', () => {
      const context = createMockStepsContext({
        canGoNext: true,
        canGoPrev: true,
      })
      const wrapper = createContextWrapper(context)

      const { result } = renderHook(() => useFormStepsContext(), { wrapper })

      expect(result.current.canGoNext).toBe(true)
      expect(result.current.canGoPrev).toBe(true)
    })

    it('возвращает navigation функции', () => {
      const context = createMockStepsContext()
      const wrapper = createContextWrapper(context)

      const { result } = renderHook(() => useFormStepsContext(), { wrapper })

      expect(typeof result.current.goToNext).toBe('function')
      expect(typeof result.current.goToPrev).toBe('function')
      expect(typeof result.current.goToStep).toBe('function')
      expect(typeof result.current.skipToEnd).toBe('function')
      expect(typeof result.current.triggerSubmit).toBe('function')
    })

    it('возвращает конфигурацию стилей', () => {
      const context = createMockStepsContext({
        orientation: 'vertical',
        size: 'lg',
        variant: 'subtle',
        colorPalette: 'blue',
      })
      const wrapper = createContextWrapper(context)

      const { result } = renderHook(() => useFormStepsContext(), { wrapper })

      expect(result.current.orientation).toBe('vertical')
      expect(result.current.size).toBe('lg')
      expect(result.current.variant).toBe('subtle')
      expect(result.current.colorPalette).toBe('blue')
    })

    it('возвращает animated и animationDuration', () => {
      const context = createMockStepsContext({
        animated: true,
        animationDuration: 0.5,
      })
      const wrapper = createContextWrapper(context)

      const { result } = renderHook(() => useFormStepsContext(), { wrapper })

      expect(result.current.animated).toBe(true)
      expect(result.current.animationDuration).toBe(0.5)
    })

    it('возвращает direction', () => {
      const context = createMockStepsContext({ direction: 'backward' })
      const wrapper = createContextWrapper(context)

      const { result } = renderHook(() => useFormStepsContext(), { wrapper })

      expect(result.current.direction).toBe('backward')
    })

    it('возвращает функции для скрытых полей', () => {
      const context = createMockStepsContext({
        hiddenFields: new Set(['field1', 'field2']),
      })
      const wrapper = createContextWrapper(context)

      const { result } = renderHook(() => useFormStepsContext(), { wrapper })

      expect(result.current.hiddenFields.has('field1')).toBe(true)
      expect(result.current.hiddenFields.has('field2')).toBe(true)
      expect(typeof result.current.hideFieldsFromValidation).toBe('function')
      expect(typeof result.current.showFieldsForValidation).toBe('function')
    })
  })
})
