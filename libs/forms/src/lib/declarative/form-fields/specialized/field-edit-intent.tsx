'use client'

import { Box, Button, HStack, VStack } from '@chakra-ui/react'
import { useEditIntentField, type UseEditIntentFieldResult } from '@letar/forms-react'
import type { ReactElement } from 'react'
import type { EditIntentFieldProps } from '../../types'
import { createField, FieldWrapper } from '../base'

/**
 * Form.Field.EditIntent — явная замена значения без передачи старого клиенту
 * (API key/Client Secret и т.п.).
 *
 * View mode показывает только безопасный `displayValue` (маска вида `********P9x4`) и кнопку
 * «Заменить». Клик атомарно переводит поле в `{isEdited: true, value: emptyValue}` и монтирует
 * дочернее поле (`children`, обычно `Form.Field.Password`) — фокус переводится в него сам.
 * «Отмена» атомарно возвращает `{isEdited: false, value: null}`, дочерний ввод размонтируется.
 *
 * `isEdited` — пользовательский intent, а не производная от `isDirty`: старый secret намеренно
 * неизвестен клиенту, сравнивать значения не с чем. Server action обновляет значение только при
 * `isEdited: true`; server fixture отдельно отклоняет UI-маски как новое значение — клиентская
 * схема не является security boundary.
 *
 * @example
 * ```tsx
 * <Form.Field.EditIntent name="apiKey" displayValue="************P9x4" emptyValue="">
 *   <Form.Field.Password name="apiKey.value" autoComplete="new-password" />
 * </Form.Field.EditIntent>
 * ```
 */
export const FieldEditIntent = createField<EditIntentFieldProps<unknown>, unknown, UseEditIntentFieldResult>({
  displayName: 'FieldEditIntent',

  // useEditIntentField подписывается на значение через useStore(form.store, ...) — здесь, на
  // верхнем уровне компонента, а не внутри render-prop <form.Field>: тот вызывается TanStack Form
  // из собственного useMemo, где хуки недопустимы (см. комментарий в use-edit-intent-field.ts).
  useFieldState: (componentProps, _resolved, { form, fullPath }) =>
    useEditIntentField({ form, fullPath, emptyValue: componentProps.emptyValue }),

  render: ({ fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    const { isViewMode, startEdit, cancelEdit, editableContainerRef, triggerButtonRef } = fieldState

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        {isViewMode
          ? (
            <HStack gap="3" data-field-name={fullPath}>
              <Box color="fg.muted" fontFamily="mono">
                {componentProps.displayValue}
              </Box>
              <Button
                ref={triggerButtonRef}
                type="button"
                size="sm"
                variant="outline"
                disabled={resolved.disabled}
                onClick={startEdit}
              >
                {componentProps.editLabel ?? 'Заменить'}
              </Button>
            </HStack>
          )
          : (
            <VStack ref={editableContainerRef} align="stretch" gap="2" data-field-name={fullPath}>
              {componentProps.children}
              <Button type="button" size="sm" variant="ghost" alignSelf="flex-start" onClick={cancelEdit}>
                {componentProps.cancelLabel ?? 'Оставить текущее'}
              </Button>
            </VStack>
          )}
      </FieldWrapper>
    )
  },
})
