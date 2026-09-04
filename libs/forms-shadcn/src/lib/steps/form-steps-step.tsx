'use client'

import { Children, isValidElement, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { type StepInfo, useFormStepsContext } from './form-steps-context'

export interface FormStepsStepProps {
  title: string
  description?: string
  icon?: ReactNode
  children: ReactNode
  onEnter?: () => void
  onLeave?: (direction: 'forward' | 'backward') => Promise<boolean> | boolean
}

/** Извлекает имена полей из детей рекурсивно — ищет компоненты с пропом `name`. */
function extractFieldNames(children: ReactNode): string[] {
  const names: string[] = []
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) { return }
    const props = child.props as Record<string, unknown>
    if (typeof props.name === 'string') { names.push(props.name) }
    if (props.children) { names.push(...extractFieldNames(props.children as ReactNode)) }
  })
  return names
}

/**
 * Form.Steps.Step — shadcn-скин (beta). Регистрирует себя в `FormSteps`, содержимое — поля шага.
 * Имена полей извлекаются автоматически для валидации при переходе.
 *
 * Beta: без `when` (условное отображение шага) и `segment` (авто-обёртка `Form.Group`) —
 * оба требуют инфраструктуры, которой пока нет в `@letar/forms-shadcn` (`Form.When`,
 * `FormGroupDeclarative`). Без анимации перехода между шагами.
 */
export function FormStepsStep({ title, description, icon, children, onEnter, onLeave }: FormStepsStepProps) {
  const { registerStep, unregisterStep, claimedIndicesRef, currentStep } = useFormStepsContext()

  // indexRef — источник истины внутри эффектов (idempotent-гвард claim/unclaim, доступен
  // синхронно между эффектами одного коммита). `index`-state — только чтобы рендер не читал
  // ref напрямую (react/refs): state обновляется в тех же точках, что и ref, и вызывает
  // локальный ре-рендер сразу, не полагаясь на побочный ре-рендер от родителя через контекст.
  const indexRef = useRef<number>(-1)
  const [index, setIndex] = useState<number>(-1)

  useEffect(() => {
    if (indexRef.current < 0) {
      const claimed = claimedIndicesRef.current
      let nextIndex = 0
      while (claimed.has(nextIndex)) { nextIndex++ }
      indexRef.current = nextIndex
      claimed.add(nextIndex)
      setIndex(nextIndex)
    }

    // fieldNames извлекаются один раз при mount — children не в deps (пересоздаётся каждый рендер)
    const fieldNames = extractFieldNames(children)
    const stepInfo: StepInfo = { index: indexRef.current, title, description, icon, fieldNames, onEnter, onLeave }
    registerStep(stepInfo)

    return () => {
      if (indexRef.current >= 0) {
        unregisterStep(indexRef.current)
        indexRef.current = -1
        setIndex(-1)
      }
    }
    // icon/children намеренно не в deps — icon это JSX-элемент, пересоздаётся каждый рендер
  }, [description, registerStep, title, unregisterStep, onEnter, onLeave, claimedIndicesRef])

  // extractFieldNames(children) — тот же приём «один раз при mount», что и в эффекте выше
  // (deps: []), поэтому значение достаточно захватить как ленивую инициализацию ref, без
  // сравнения/перезаписи в теле рендера.
  const fieldNamesRef = useRef<string[]>(useMemo(() => extractFieldNames(children), []))

  const iconRef = useRef(icon)
  useEffect(() => {
    iconRef.current = icon
  }, [icon])

  useEffect(() => {
    if (indexRef.current >= 0) {
      registerStep({
        index: indexRef.current,
        title,
        description,
        icon: iconRef.current,
        fieldNames: fieldNamesRef.current,
        onEnter,
        onLeave,
      })
    }
  }, [title, description, registerStep, onEnter, onLeave])

  if (index < 0) { return null }
  if (index !== currentStep) { return null }

  return <div data-step-index={index}>{children}</div>
}

FormStepsStep.displayName = 'FormStepsStep'
