'use client'

import { type CSSProperties, type ReactNode, useContext, useEffect, useMemo, useRef } from 'react'
import { useFormGroup } from '../form-group'
import { extractFieldNames } from './extract-field-names'
import { useDeclarativeForm } from './form-context'
import { FormStepsContext } from './form-steps/form-steps-context'

/**
 * Props for Form.When conditional rendering component
 */
export interface FormWhenProps<TValue = unknown> {
  /** Field name to watch (relative to current group context) */
  field: string
  /** Render children when field value equals this value */
  is?: TValue
  /** Render children when field value is NOT equal to this value */
  isNot?: TValue
  /** Render children when field value is in this array */
  in?: TValue[]
  /** Render children when field value is NOT in this array */
  notIn?: TValue[]
  /** Custom condition function */
  condition?: (value: TValue) => boolean
  /** Content to render when condition is true */
  children: ReactNode
  /** Content to render when condition is false (optional) */
  fallback?: ReactNode
}

/**
 * Form.When - Conditional field rendering based on other field values
 *
 * Renders children only when the specified field matches the condition.
 * Uses form.Subscribe for optimal performance (only re-renders when watched field changes).
 *
 * @example With exact value match
 * ```tsx
 * <Form.Field.Select name="type" options={['individual', 'company']} />
 *
 * <Form.When field="type" is="company">
 *   <Form.Field.String name="companyName" label="Company Name" />
 *   <Form.Field.String name="inn" label="INN" />
 * </Form.When>
 * ```
 *
 * @example With negation
 * ```tsx
 * <Form.When field="hasDiscount" isNot={true}>
 *   <Form.Field.Number name="fullPrice" label="Full Price" />
 * </Form.When>
 * ```
 *
 * @example With array of values
 * ```tsx
 * <Form.When field="role" in={['admin', 'moderator']}>
 *   <Form.Field.Checkbox name="canDelete" label="Can delete users" />
 * </Form.When>
 * ```
 *
 * @example With custom condition
 * ```tsx
 * <Form.When field="age" condition={(age) => age >= 18}>
 *   <Form.Field.Checkbox name="adultContent" label="Show adult content" />
 * </Form.When>
 * ```
 *
 * @example With fallback content
 * ```tsx
 * <Form.When field="isPremium" is={true} fallback={<Text>Upgrade to premium</Text>}>
 *   <Form.Field.Select name="premiumTheme" options={themes} />
 * </Form.When>
 * ```
 *
 * @example Nested in Form.Group
 * ```tsx
 * <Form.Group name="settings">
 *   <Form.Field.Switch name="notifications" label="Enable notifications" />
 *   <Form.When field="notifications" is={true}>
 *     <Form.Field.Select name="frequency" options={frequencies} />
 *   </Form.When>
 * </Form.Group>
 * ```
 */
/**
 * Internal component for handling field show/hide
 * Integrates with FormStepsContext to exclude hidden fields from validation
 */
/**
 * Визуально не занимающий места, но фокусируемый якорь. Рендерится всегда (не зависит от
 * shouldRender), поэтому переживает размонтирование скрываемого блока — единственный DOM-узел,
 * на который безопасно возвращать фокус после того, как контейнер с полями уже удалён из дерева.
 */
const focusAnchorStyle: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  outline: 'none',
}

function FormWhenContent({
  shouldRender,
  children,
  fallback,
  parentPath,
}: {
  shouldRender: boolean
  children: ReactNode
  fallback: ReactNode
  parentPath: string
}): ReactNode {
  const stepsContext = useContext(FormStepsContext)

  const containerRef = useRef<HTMLDivElement>(null)
  const focusAnchorRef = useRef<HTMLSpanElement>(null)
  const wasFocusInsideRef = useRef(false)
  const prevShouldRenderForFocus = useRef(shouldRender)

  // `children` — нестабильная JSX-ссылка (пересоздаётся на каждый ре-рендер родителя), поэтому
  // `extractFieldNames` тоже пересчитывает НОВЫЙ массив на каждый ре-рендер, даже когда его
  // содержимое не изменилось. Стабилизируем по содержимому — тот же приём, что уже применён к
  // `fieldNamesRef` в `form-steps-step.tsx`.
  const rawFieldNames = useMemo(() => extractFieldNames(children, parentPath), [children, parentPath])
  const fieldNamesRef = useRef<string[]>(rawFieldNames)
  // oxlint-disable-next-line react/refs
  const fieldNamesChanged = rawFieldNames.length !== fieldNamesRef.current.length
    // oxlint-disable-next-line react/refs
    || rawFieldNames.some((name, i) => name !== fieldNamesRef.current[i])
  if (fieldNamesChanged) {
    // oxlint-disable-next-line react/refs
    fieldNamesRef.current = rawFieldNames
  }
  // oxlint-disable-next-line react/refs
  const fieldNames = fieldNamesRef.current

  // Текущее состояние "поля скрыты от валидации" — источник истины для синхронизации ниже,
  // НЕ cleanup-функция эффекта. Стабилизировать одну только идентичность `fieldNames` оказалось
  // недостаточно: `stepsContext` (значение `useContext(FormStepsContext)`) тоже меняет ссылку
  // на каждый ре-рендер, пока регистрируются соседние `Form.Steps.Step` (`contextValue` в
  // form-steps.tsx пересобирается вместе с растущим `stepCount`) — и эффект с `stepsContext` в
  // deps перезапускается для КАЖДОГО такого чужого ре-рендера, а не только когда реально меняется
  // `shouldRender`. Прежняя реализация полагалась на cleanup-функцию эффекта как на "отмену"
  // предыдущего hide/show — но React вызывает cleanup при КАЖДОМ пересоздании эффекта, включая
  // эти посторонние срабатывания, и cleanup при `!shouldRender` безусловно вызывал
  // `showFieldsForValidation`, "рассекречивая" уже скрытое поле. Следующий проход эффекта не
  // восстанавливал hidden-статус (асимметрия `isFirstMount`/`prevShouldRender` — обе ветки
  // "стало скрыто"/"стало видимо" не срабатывали, если предыдущее значение уже было `false`).
  // Итог — `hiddenFields` пустеет уже после первого постороннего ре-рендера, а required-поле,
  // скрытое условием, продолжает блокировать `validateCurrentStep` (кнопку «Далее»
  // `Form.Steps.Navigation`) — тупик, не зависящий от того, обёрнуто ли поле в кастомный
  // nullary-компонент, воспроизводится и на прямом потомке `Form.When`.
  //
  // Фикс: эффект синхронизации идемпотентен и НЕ имеет cleanup-функции — он просто сверяет
  // `shouldRender` с уже известным `isHiddenRef.current` и вызывает hide/show только на РЕАЛЬНОЕ
  // изменение. Восстановление на настоящий unmount вынесено в отдельный эффект с пустым массивом
  // зависимостей — его cleanup гарантированно срабатывает только при размонтировании компонента,
  // не при ре-рендере с новым `stepsContext`.
  const isHiddenRef = useRef(false)
  const stepsContextRef = useRef(stepsContext)
  const fieldNamesForUnmountRef = useRef(fieldNames)
  // oxlint-disable-next-line react/refs
  stepsContextRef.current = stepsContext
  // oxlint-disable-next-line react/refs
  fieldNamesForUnmountRef.current = fieldNames

  useEffect(() => {
    if (!stepsContext || fieldNames.length === 0) {
      return
    }

    if (!shouldRender && !isHiddenRef.current) {
      stepsContext.hideFieldsFromValidation(fieldNames)
      isHiddenRef.current = true
    } else if (shouldRender && isHiddenRef.current) {
      stepsContext.showFieldsForValidation(fieldNames)
      isHiddenRef.current = false
    }
  }, [shouldRender, stepsContext, fieldNames])

  useEffect(() => {
    return () => {
      const context = stepsContextRef.current
      const namesOnUnmount = fieldNamesForUnmountRef.current
      if (isHiddenRef.current && context && namesOnUnmount.length > 0) {
        context.showFieldsForValidation(namesOnUnmount)
      }
    }
    // Намеренно пустой массив зависимостей: этот эффект нужен только ради своего cleanup на
    // настоящий unmount компонента, не на каждое изменение shouldRender/stepsContext/fieldNames
    // (см. докстринг выше). Актуальные значения читаются из рефов, синхронизируемых в теле
    // рендера — ESLint это видит и не требует их в deps.
  }, [])

  // Следим, находится ли текущий фокус внутри блока — по document-level 'focusin', а не по
  // 'focusout' контейнера: удаление сфокусированного узла из DOM само по себе синхронно вызывает
  // blur/focusout, и этот факт нельзя отличить от «пользователь ушёл сам». Слушаем только события
  // РЕАЛЬНОГО перевода фокуса на новый элемент — тогда снятие DOM-узла эту логику не портит.
  useEffect(() => {
    const handleFocusIn = (event: FocusEvent): void => {
      wasFocusInsideRef.current = !!containerRef.current && containerRef.current.contains(event.target as Node)
    }

    document.addEventListener('focusin', handleFocusIn)
    return () => document.removeEventListener('focusin', handleFocusIn)
  }, [])

  // При скрытии блока, если фокус был внутри него — переносим на постоянный якорь-заглушку,
  // чтобы клавиатурный/скринридер-пользователь не терял место в форме (фокус не падает на <body>).
  useEffect(() => {
    const wasVisible = prevShouldRenderForFocus.current
    prevShouldRenderForFocus.current = shouldRender

    if (wasVisible && !shouldRender && wasFocusInsideRef.current) {
      wasFocusInsideRef.current = false
      focusAnchorRef.current?.focus()
    }
  }, [shouldRender])

  return (
    <>
      <span ref={focusAnchorRef} tabIndex={-1} style={focusAnchorStyle} data-form-when-focus-anchor="" />
      {shouldRender
        ? (
          <div ref={containerRef} style={{ display: 'contents' }}>
            {children}
          </div>
        )
        : fallback}
    </>
  )
}

export function FormWhen<TValue = unknown>({
  field,
  is,
  isNot,
  in: inArray,
  notIn,
  condition,
  children,
  fallback = null,
}: FormWhenProps<TValue>): ReactNode {
  const { form } = useDeclarativeForm()
  const parentGroup = useFormGroup()

  // Build full field path
  const fullPath = parentGroup ? `${parentGroup.name}.${field}` : field

  // Parent path for extracting field names
  const parentPath = parentGroup?.name ?? ''

  // Create selector function for the field value
  const selector = (state: { values: Record<string, unknown> }): TValue => {
    // Navigate to nested value using dot notation
    const parts = fullPath.split('.')
    let value: unknown = state.values
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[part]
      } else {
        value = undefined
        break
      }
    }
    return value as TValue
  }

  return (
    <form.Subscribe selector={selector}>
      {(value: TValue) => {
        let shouldRender: boolean

        if (condition !== undefined) {
          // Custom condition function
          shouldRender = condition(value)
        } else if (is !== undefined) {
          // Exact match
          shouldRender = value === is
        } else if (isNot !== undefined) {
          // Negation
          shouldRender = value !== isNot
        } else if (inArray !== undefined) {
          // Value in array
          shouldRender = inArray.includes(value)
        } else if (notIn !== undefined) {
          // Value not in array
          shouldRender = !notIn.includes(value)
        } else {
          // Default: render if truthy
          shouldRender = Boolean(value)
        }

        return (
          <FormWhenContent shouldRender={shouldRender} fallback={fallback} parentPath={parentPath}>
            {children}
          </FormWhenContent>
        )
      }}
    </form.Subscribe>
  )
}
