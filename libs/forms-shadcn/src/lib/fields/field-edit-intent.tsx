'use client'

import { useEditIntentField, type UseEditIntentFieldResult } from '@letar/forms-react'
import type { ReactElement } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import type { EditIntentFieldProps } from './types'

/**
 * Form.Field.EditIntent — shadcn-скин. Value-контракт и view/edit/focus-логика те же, что у
 * Chakra-версии (`useEditIntentField` из `@letar/forms-react`) — отличается только вёрстка.
 *
 * @example
 * ```tsx
 * <FieldEditIntent name="apiKey" displayValue="************P9x4" emptyValue="">
 *   <FieldPassword name="apiKey.value" autoComplete="new-password" />
 * </FieldEditIntent>
 * ```
 */
export const FieldEditIntent = createField<EditIntentFieldProps<unknown>, unknown, UseEditIntentFieldResult>({
  displayName: 'FieldEditIntent',

  // Как и в Chakra-скине: подписка на значение через useStore(form.store, ...) должна жить в
  // useFieldState (top-level), не внутри render-prop <form.Field> — там хуки недопустимы
  // (TanStack Form вызывает children из собственного useMemo).
  useFieldState: (componentProps, _resolved, { form, fullPath }) =>
    useEditIntentField({ form, fullPath, emptyValue: componentProps.emptyValue }),

  render: ({ fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    const { isViewMode, startEdit, cancelEdit, editableContainerRef, triggerButtonRef } = fieldState

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        {isViewMode
          ? (
            <div className="flex items-center gap-3" data-field-name={fullPath}>
              <span className="text-muted-foreground font-mono text-sm">{componentProps.displayValue}</span>
              <button
                ref={triggerButtonRef}
                type="button"
                disabled={resolved.disabled}
                onClick={startEdit}
                className="border-input inline-flex items-center rounded-md border bg-transparent px-3 py-1.5 text-sm shadow-xs hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
              >
                {componentProps.editLabel ?? 'Заменить'}
              </button>
            </div>
          )
          : (
            <div ref={editableContainerRef} className="flex flex-col items-start gap-2" data-field-name={fullPath}>
              {componentProps.children}
              <button
                type="button"
                onClick={cancelEdit}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                {componentProps.cancelLabel ?? 'Оставить текущее'}
              </button>
            </div>
          )}
      </FieldWrapper>
    )
  },
})
