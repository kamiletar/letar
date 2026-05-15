import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DeclarativeFormContext } from '../form-context'
import type { DeclarativeFormContextValue } from '../types'
import { FormStepsContext, type FormStepsContextValue } from './form-steps-context'
import { FormStepsNavigation } from './form-steps-navigation'

// Обёртка с Chakra UI
const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

// Мок form context
const mockHandleSubmit = vi.fn()
function createMockFormContext(): DeclarativeFormContextValue {
  return {
    form: {
      handleSubmit: mockHandleSubmit,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  }
}

// Мок steps context
function createMockStepsContext(overrides?: Partial<FormStepsContextValue>): FormStepsContextValue {
  return {
    currentStep: 0,
    stepCount: 3,
    steps: [],
    goToNext: vi.fn().mockResolvedValue(true),
    goToPrev: vi.fn(),
    goToStep: vi.fn(),
    skipToEnd: vi.fn(),
    triggerSubmit: vi.fn(),
    canGoNext: true,
    canGoPrev: false,
    isCompleted: false,
    isLastStep: false,
    isFirstStep: true,
    registerStep: vi.fn(),
    unregisterStep: vi.fn(),
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
    hideFieldsFromValidation: vi.fn(),
    showFieldsForValidation: vi.fn(),
    clearStepPersistence: vi.fn(),
    ...overrides,
  }
}

// Wrapper с обоими контекстами
function createWrapper(formContext: DeclarativeFormContextValue, stepsContext: FormStepsContextValue) {
  return ({ children }: { children: ReactNode }) =>
    createElement(
      TestWrapper,
      null,
      createElement(
        DeclarativeFormContext.Provider,
        { value: formContext },
        createElement(FormStepsContext.Provider, { value: stepsContext }, children)
      )
    )
}

describe('FormStepsNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('рендерит кнопки Back и Next по умолчанию', () => {
      const formContext = createMockFormContext()
      const stepsContext = createMockStepsContext()
      const wrapper = createWrapper(formContext, stepsContext)

      render(<FormStepsNavigation />, { wrapper })

      expect(screen.getByText('Back')).toBeInTheDocument()
      expect(screen.getByText('Next')).toBeInTheDocument()
    })

    it('рендерит Submit вместо Next на последнем шаге', () => {
      const formContext = createMockFormContext()
      const stepsContext = createMockStepsContext({ isLastStep: true })
      const wrapper = createWrapper(formContext, stepsContext)

      render(<FormStepsNavigation />, { wrapper })

      expect(screen.getByText('Back')).toBeInTheDocument()
      expect(screen.getByText('Submit')).toBeInTheDocument()
      expect(screen.queryByText('Next')).not.toBeInTheDocument()
    })

    it('использует кастомные labels', () => {
      const formContext = createMockFormContext()
      const stepsContext = createMockStepsContext()
      const wrapper = createWrapper(formContext, stepsContext)

      render(<FormStepsNavigation prevLabel="Назад" nextLabel="Вперёд" submitLabel="Отправить" />, { wrapper })

      expect(screen.getByText('Назад')).toBeInTheDocument()
      expect(screen.getByText('Вперёд')).toBeInTheDocument()
    })

    it('скрывает кнопку Back когда showPrev=false', () => {
      const formContext = createMockFormContext()
      const stepsContext = createMockStepsContext()
      const wrapper = createWrapper(formContext, stepsContext)

      render(<FormStepsNavigation showPrev={false} />, { wrapper })

      expect(screen.queryByText('Back')).not.toBeInTheDocument()
      expect(screen.getByText('Next')).toBeInTheDocument()
    })

    it('скрывает кнопку Next когда showNext=false', () => {
      const formContext = createMockFormContext()
      const stepsContext = createMockStepsContext()
      const wrapper = createWrapper(formContext, stepsContext)

      render(<FormStepsNavigation showNext={false} />, { wrapper })

      expect(screen.getByText('Back')).toBeInTheDocument()
      expect(screen.queryByText('Next')).not.toBeInTheDocument()
    })

    it('показывает кнопку Skip когда showSkip=true', () => {
      const formContext = createMockFormContext()
      const stepsContext = createMockStepsContext()
      const wrapper = createWrapper(formContext, stepsContext)

      render(<FormStepsNavigation showSkip />, { wrapper })

      expect(screen.getByText('Skip')).toBeInTheDocument()
    })
  })

  describe('disabled states', () => {
    it('отключает Back на первом шаге', () => {
      const formContext = createMockFormContext()
      const stepsContext = createMockStepsContext({
        isFirstStep: true,
        canGoPrev: false,
      })
      const wrapper = createWrapper(formContext, stepsContext)

      render(<FormStepsNavigation />, { wrapper })

      expect(screen.getByText('Back')).toBeDisabled()
    })

    it('включает Back когда не первый шаг', () => {
      const formContext = createMockFormContext()
      const stepsContext = createMockStepsContext({
        isFirstStep: false,
        canGoPrev: true,
        currentStep: 1,
      })
      const wrapper = createWrapper(formContext, stepsContext)

      render(<FormStepsNavigation />, { wrapper })

      expect(screen.getByText('Back')).not.toBeDisabled()
    })
  })

  describe('navigation', () => {
    it('вызывает goToNext при клике на Next', async () => {
      const formContext = createMockFormContext()
      const goToNext = vi.fn().mockResolvedValue(true)
      const stepsContext = createMockStepsContext({ goToNext })
      const wrapper = createWrapper(formContext, stepsContext)

      render(<FormStepsNavigation />, { wrapper })

      await userEvent.click(screen.getByText('Next'))

      await waitFor(() => {
        expect(goToNext).toHaveBeenCalled()
      })
    })

    it('вызывает goToPrev при клике на Back', async () => {
      const formContext = createMockFormContext()
      const goToPrev = vi.fn()
      const stepsContext = createMockStepsContext({
        goToPrev,
        isFirstStep: false,
        canGoPrev: true,
        currentStep: 1,
      })
      const wrapper = createWrapper(formContext, stepsContext)

      render(<FormStepsNavigation />, { wrapper })

      await userEvent.click(screen.getByText('Back'))

      expect(goToPrev).toHaveBeenCalled()
    })

    it('вызывает form.handleSubmit при клике на Submit', async () => {
      const formContext = createMockFormContext()
      const stepsContext = createMockStepsContext({ isLastStep: true })
      const wrapper = createWrapper(formContext, stepsContext)

      render(<FormStepsNavigation />, { wrapper })

      await userEvent.click(screen.getByText('Submit'))

      expect(mockHandleSubmit).toHaveBeenCalled()
    })

    it('вызывает skipToEnd при клике на Skip', async () => {
      const formContext = createMockFormContext()
      const skipToEnd = vi.fn()
      const stepsContext = createMockStepsContext({ skipToEnd })
      const wrapper = createWrapper(formContext, stepsContext)

      render(<FormStepsNavigation showSkip />, { wrapper })

      await userEvent.click(screen.getByText('Skip'))

      await waitFor(() => {
        expect(skipToEnd).toHaveBeenCalled()
      })
    })
  })

  describe('callbacks', () => {
    it('вызывает onStepChange после успешного goToNext', async () => {
      const formContext = createMockFormContext()
      const onStepChange = vi.fn()
      const stepsContext = createMockStepsContext({
        goToNext: vi.fn().mockResolvedValue(true),
        currentStep: 0,
      })
      const wrapper = createWrapper(formContext, stepsContext)

      render(<FormStepsNavigation onStepChange={onStepChange} />, { wrapper })

      await userEvent.click(screen.getByText('Next'))

      await waitFor(() => {
        expect(onStepChange).toHaveBeenCalledWith(1)
      })
    })

    it('вызывает onSubmit при клике на Submit', async () => {
      const formContext = createMockFormContext()
      const onSubmit = vi.fn()
      const stepsContext = createMockStepsContext({ isLastStep: true })
      const wrapper = createWrapper(formContext, stepsContext)

      render(<FormStepsNavigation onSubmit={onSubmit} />, { wrapper })

      await userEvent.click(screen.getByText('Submit'))

      expect(onSubmit).toHaveBeenCalled()
    })

    it('отменяет skip если onSkip возвращает false', async () => {
      const formContext = createMockFormContext()
      const skipToEnd = vi.fn()
      const onSkip = vi.fn().mockResolvedValue(false)
      const stepsContext = createMockStepsContext({ skipToEnd })
      const wrapper = createWrapper(formContext, stepsContext)

      render(<FormStepsNavigation showSkip onSkip={onSkip} />, { wrapper })

      await userEvent.click(screen.getByText('Skip'))

      await waitFor(() => {
        expect(onSkip).toHaveBeenCalled()
      })

      // skipToEnd не должен быть вызван
      expect(skipToEnd).not.toHaveBeenCalled()
    })
  })
})
