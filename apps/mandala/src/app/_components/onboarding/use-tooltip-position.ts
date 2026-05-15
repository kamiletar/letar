'use client'

import type { RefObject } from 'react'
import { useEffect, useState } from 'react'
import type { OnboardingStep } from './onboarding-types'

/** Позиция тултипа */
export interface TooltipPosition {
  /** Смещение сверху */
  top: number
  /** Смещение слева */
  left: number
  /** Позиция стрелки */
  arrowPosition: 'top' | 'bottom' | 'left' | 'right'
}

/** Опции хука useTooltipPosition */
export interface UseTooltipPositionOptions {
  /** Ref на tooltip элемент */
  tooltipRef: RefObject<HTMLDivElement | null>
  /** Текущий шаг онбординга */
  currentStep: OnboardingStep | null
  /** Активен ли тултип */
  isActive: boolean
}

/** Результат хука useTooltipPosition */
export interface UseTooltipPositionReturn {
  /** Позиция тултипа */
  position: TooltipPosition
  /** Целевой элемент */
  targetElement: HTMLElement | null
}

/**
 * Вычисляет позицию tooltip относительно целевого элемента.
 * Корректирует позицию если выходит за границы экрана.
 */
export function calculateTooltipPosition(
  target: HTMLElement,
  tooltip: HTMLElement,
  stepPosition: OnboardingStep['position']
): TooltipPosition {
  const targetRect = target.getBoundingClientRect()
  const tooltipRect = tooltip.getBoundingClientRect()
  const padding = 12
  const arrowSize = 8

  let top = 0
  let left = 0
  let arrowPosition: TooltipPosition['arrowPosition'] = 'top'

  switch (stepPosition) {
    case 'top':
      top = targetRect.top - tooltipRect.height - padding - arrowSize
      left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2
      arrowPosition = 'bottom'
      break
    case 'bottom':
      top = targetRect.bottom + padding + arrowSize
      left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2
      arrowPosition = 'top'
      break
    case 'left':
      top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2
      left = targetRect.left - tooltipRect.width - padding - arrowSize
      arrowPosition = 'right'
      break
    case 'right':
      top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2
      left = targetRect.right + padding + arrowSize
      arrowPosition = 'left'
      break
  }

  // Корректировка если выходит за границы экрана
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  if (left < padding) {
    left = padding
  }
  if (left + tooltipRect.width > viewportWidth - padding) {
    left = viewportWidth - tooltipRect.width - padding
  }
  if (top < padding) {
    top = padding
  }
  if (top + tooltipRect.height > viewportHeight - padding) {
    top = viewportHeight - tooltipRect.height - padding
  }

  return { top, left, arrowPosition }
}

/**
 * Хук для позиционирования тултипа относительно целевого элемента.
 * Управляет поиском целевого элемента и обновлением позиции
 * при скролле и ресайзе.
 *
 * @example
 * ```tsx
 * const tooltipRef = useRef<HTMLDivElement>(null)
 * const { position, targetElement } = useTooltipPosition({
 *   tooltipRef,
 *   currentStep,
 *   isActive,
 * })
 * ```
 */
export function useTooltipPosition({
  tooltipRef,
  currentStep,
  isActive,
}: UseTooltipPositionOptions): UseTooltipPositionReturn {
  const [position, setPosition] = useState<TooltipPosition>({
    top: 0,
    left: 0,
    arrowPosition: 'top',
  })
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null)

  // Поиск целевого элемента
  useEffect(() => {
    if (!currentStep || !isActive) {
      setTargetElement(null)
      return
    }

    const findTarget = () => {
      const target = document.querySelector(`[data-onboarding="${currentStep.target}"]`) as HTMLElement | null
      setTargetElement(target)
    }

    // Попытка найти элемент с небольшой задержкой (для анимированных элементов)
    findTarget()
    const timeout = setTimeout(findTarget, 300)

    return () => {
      clearTimeout(timeout)
    }
  }, [currentStep, isActive])

  // Обновление позиции при изменении размера или скролле
  useEffect(() => {
    if (!targetElement || !tooltipRef.current) {
      return
    }

    const updatePosition = () => {
      if (!targetElement || !tooltipRef.current || !currentStep) {
        return
      }
      const newPosition = calculateTooltipPosition(targetElement, tooltipRef.current, currentStep.position)
      setPosition(newPosition)
    }

    // Начальное вычисление позиции
    updatePosition()

    // Обновление при скролле и ресайзе
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [targetElement, currentStep, tooltipRef])

  return { position, targetElement }
}

/**
 * Хук для подсветки целевого элемента онбординга.
 * Добавляет визуальные стили при активации и убирает при деактивации.
 */
export function useTargetHighlight(targetElement: HTMLElement | null): void {
  useEffect(() => {
    if (!targetElement) {
      return
    }

    // Сохраняем оригинальные стили
    const originalStyles = {
      position: targetElement.style.position,
      zIndex: targetElement.style.zIndex,
      boxShadow: targetElement.style.boxShadow,
      borderRadius: targetElement.style.borderRadius,
      transition: targetElement.style.transition,
    }

    // Добавляем подсветку
    targetElement.style.position = 'relative'
    targetElement.style.zIndex = '10001'
    targetElement.style.boxShadow = '0 0 0 4px rgba(202, 158, 103, 0.5), 0 0 20px rgba(202, 158, 103, 0.3)'
    targetElement.style.borderRadius = '8px'
    targetElement.style.transition = 'box-shadow 0.3s ease'

    return () => {
      // Восстанавливаем оригинальные стили
      targetElement.style.position = originalStyles.position
      targetElement.style.zIndex = originalStyles.zIndex
      targetElement.style.boxShadow = originalStyles.boxShadow
      targetElement.style.borderRadius = originalStyles.borderRadius
      targetElement.style.transition = originalStyles.transition
    }
  }, [targetElement])
}

/** Стили стрелки для разных позиций (Chakra-совместимые) */
export const arrowStyles = {
  top: {
    top: '-8px',
    left: '50%',
    transform: 'translateX(-50%) rotate(45deg)',
  },
  bottom: {
    bottom: '-8px',
    left: '50%',
    transform: 'translateX(-50%) rotate(45deg)',
  },
  left: {
    left: '-8px',
    top: '50%',
    transform: 'translateY(-50%) rotate(45deg)',
  },
  right: {
    right: '-8px',
    top: '50%',
    transform: 'translateY(-50%) rotate(45deg)',
  },
} as const
