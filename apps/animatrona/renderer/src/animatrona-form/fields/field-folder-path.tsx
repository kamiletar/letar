'use client'

import { LuFolderOpen } from 'react-icons/lu'

import { Box, Button, Field, HStack, Text } from '@chakra-ui/react'
import type { AnyFieldApi } from '@tanstack/react-form'
import type { ReactElement, ReactNode } from 'react'

import { FieldTooltip, type FieldTooltipMeta, useDeclarativeForm, useFormGroup } from '@letar/forms'

export interface FolderPathFieldProps {
  name?: string
  label?: ReactNode
  helperText?: ReactNode
  required?: boolean
  disabled?: boolean
  readOnly?: boolean
  /** Tooltip для лейбла */
  tooltip?: FieldTooltipMeta
  /** Текст кнопки выбора */
  buttonText?: string
  /** Placeholder когда папка не выбрана */
  placeholder?: string
}

/**
 * AnimatronaForm.Field.FolderPath — Поле выбора папки через Electron dialog
 *
 * Использует window.electronAPI.dialog.selectFolder() для открытия нативного диалога.
 *
 * @example
 * ```tsx
 * <AnimatronaForm.Field.FolderPath
 *   name="libraryPath"
 *   label="Папка библиотеки"
 *   placeholder="Выберите папку..."
 * />
 * ```
 */
export function FieldFolderPath({
  name,
  label = 'Папка',
  helperText,
  required,
  disabled,
  readOnly,
  tooltip,
  buttonText = 'Выбрать',
  placeholder = 'Не выбрана',
}: FolderPathFieldProps): ReactElement {
  const { form } = useDeclarativeForm()
  const groupContext = useFormGroup()

  // Определяем полный путь к полю
  const fullPath = name ? (groupContext?.name ? `${groupContext.name}.${name}` : name) : (groupContext?.name ?? '')

  return (
    <form.Field name={fullPath}>
      {(field: AnyFieldApi) => {
        const errors = field.state.meta.errors
        const hasError = errors && errors.length > 0
        const value = field.state.value as string | null | undefined

        const handleSelectFolder = async () => {
          if (disabled || readOnly) {
            return
          }

          try {
            const folder = await window.electronAPI?.dialog.selectFolder()
            if (folder) {
              field.handleChange(folder)
            }
          } catch (error) {
            console.error('Ошибка выбора папки:', error)
          }
        }

        return (
          <Field.Root invalid={hasError} required={required} disabled={disabled} readOnly={readOnly}>
            {label && (
              <Field.Label>
                {tooltip
                  ? (
                    <HStack gap={1}>
                      <span>{label}</span>
                      <FieldTooltip {...tooltip} />
                    </HStack>
                  )
                  : label}
                {required && <Field.RequiredIndicator />}
              </Field.Label>
            )}
            <HStack w="100%">
              <Box
                flex={1}
                p={3}
                bg="bg.subtle"
                borderRadius="md"
                borderWidth={1}
                borderColor={hasError ? 'red.500' : 'border.subtle'}
                minH="42px"
                display="flex"
                alignItems="center"
              >
                {value
                  ? (
                    <Text fontSize="sm" wordBreak="break-all">
                      {value}
                    </Text>
                  )
                  : (
                    <Text fontSize="sm" color="fg.subtle">
                      {placeholder}
                    </Text>
                  )}
              </Box>
              <Button variant="outline" onClick={handleSelectFolder} disabled={disabled || readOnly} size="sm">
                <LuFolderOpen />
                {buttonText}
              </Button>
            </HStack>
            {hasError
              ? <Field.ErrorText>{errors.map((e: { message?: string }) => e?.message ?? e).join(', ')}</Field.ErrorText>
              : (
                helperText && <Field.HelperText>{helperText}</Field.HelperText>
              )}
          </Field.Root>
        )
      }}
    </form.Field>
  )
}
