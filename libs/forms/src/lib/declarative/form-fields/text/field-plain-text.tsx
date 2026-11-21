'use client'

import { Box, Field } from '@chakra-ui/react'
import { type ReactElement, type Ref, useEffect, useId, useRef } from 'react'
import type { BaseFieldProps } from '../../types'
import { createField, FieldError, FieldLabel } from '../base'
import {
  createPlainTextController,
  type PlainTextController,
  type PlainTextEditorHandle,
  type PlainTextHistoryState,
  type PlainTextTransaction,
} from './plain-text-controller'

export interface PlainTextEditorProps {
  value: string
  onChange: (text: string) => void
  onBlur?: () => void
  label?: string
  placeholder?: string
  minHeight?: string | number
  borderless?: boolean
  disabled?: boolean
  readOnly?: boolean
  invalid?: boolean
  editorRef?: Ref<PlainTextEditorHandle>
  onHistoryChange?: (state: PlainTextHistoryState) => void
  onTransaction?: (transaction: PlainTextTransaction) => void
  onKeyboardHistory?: (direction: 'undo' | 'redo') => void
  /** Смена ключа означает загрузку нового исходного черновика без отмены к прежнему документу. */
  baselineKey?: string | number
  historyDepth?: number
}

function assignRef(ref: Ref<PlainTextEditorHandle> | undefined, value: PlainTextEditorHandle | null) {
  if (typeof ref === 'function') { ref(value) }
  else if (ref) { ref.current = value }
}

/** Контролируемый текст; редактор не пересоздаётся после каждого React render. */
export function PlainTextEditor(props: PlainTextEditorProps): ReactElement {
  const host = useRef<HTMLDivElement>(null)
  const controller = useRef<PlainTextController | null>(null)
  const latest = useRef(props)
  useEffect(() => {
    latest.current = props
  })
  const baseline = useRef(props.baselineKey)
  const id = useId()
  useEffect(() => {
    if (!host.current) { return }
    const instance = createPlainTextController({
      element: host.current,
      text: latest.current.value,
      editable: !latest.current.disabled && !latest.current.readOnly,
      historyDepth: latest.current.historyDepth,
      onChange: (value) => latest.current.onChange(value),
      onBlur: () => latest.current.onBlur?.(),
      onHistoryChange: (value) => latest.current.onHistoryChange?.(value),
      onTransaction: (value) => latest.current.onTransaction?.(value),
      onKeyboardHistory: (direction) => {
        if (latest.current.onKeyboardHistory) { latest.current.onKeyboardHistory(direction) }
        else if (direction === 'undo') { instance.undo() }
        else { instance.redo() }
      },
    })
    controller.current = instance
    assignRef(latest.current.editorRef, instance)
    return () => {
      assignRef(latest.current.editorRef, null)
      instance.destroy()
      controller.current = null
    }
  }, [])
  useEffect(() => {
    const reset = props.baselineKey !== baseline.current
    baseline.current = props.baselineKey
    controller.current?.replaceText(props.value, { baseline: reset })
  }, [props.value, props.baselineKey])
  useEffect(() => {
    controller.current?.setEditable(!props.disabled && !props.readOnly)
    controller.current?.setAttributes({
      id,
      'aria-label': props.label ?? 'Text',
      'aria-multiline': 'true',
      'aria-disabled': String(Boolean(props.disabled)),
      'aria-readonly': String(Boolean(props.readOnly)),
      'aria-invalid': String(Boolean(props.invalid)),
      'data-placeholder': props.placeholder ?? '',
    })
  }, [id, props.label, props.disabled, props.readOnly, props.invalid, props.placeholder])
  return (
    <Box
      ref={host}
      width="full"
      borderWidth={props.borderless ? '0' : '1px'}
      borderColor={props.invalid ? 'border.error' : 'border'}
      borderRadius={props.borderless ? '0' : 'md'}
      opacity={props.disabled ? 0.5 : undefined}
      css={{
        '& .tiptap': {
          minHeight: props.minHeight ?? '200px',
          padding: props.borderless ? '0' : '12px',
          outline: 'none',
          fontFamily: 'inherit',
          fontSize: 'inherit',
          lineHeight: '1.65',
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
          tabSize: 4,
        },
        '& .tiptap:focus-visible': { outline: '2px solid var(--chakra-colors-border-focus)', outlineOffset: '4px' },
        '& [data-plain-text]': { margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontFamily: 'inherit' },
        '& .tiptap:has([data-plain-text] > br:only-child)::before': {
          content: 'attr(data-placeholder)',
          float: 'left',
          height: 0,
          color: 'var(--chakra-colors-fg-muted)',
          pointerEvents: 'none',
        },
      }}
    />
  )
}

export interface PlainTextFieldProps
  extends BaseFieldProps, Omit<PlainTextEditorProps, 'value' | 'onChange' | 'onBlur' | 'label' | 'invalid'>
{
  hideLabel?: boolean
}

/** Optional поле подключается как extraFields: { PlainText: FieldPlainText }. */
export const FieldPlainText = createField<PlainTextFieldProps, string>({
  displayName: 'FieldPlainText',
  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => (
    <Field.Root
      invalid={hasError}
      required={resolved.required}
      disabled={resolved.disabled}
      readOnly={resolved.readOnly}
    >
      {!componentProps.hideLabel && (
        <FieldLabel label={resolved.label} required={resolved.required} tooltip={resolved.tooltip} />
      )}
      <PlainTextEditor
        value={field.state.value ?? ''}
        onChange={(value) => field.handleChange(value)}
        onBlur={field.handleBlur}
        label={typeof resolved.label === 'string' ? resolved.label : fullPath}
        placeholder={resolved.placeholder}
        disabled={resolved.disabled}
        readOnly={resolved.readOnly}
        invalid={hasError}
        minHeight={componentProps.minHeight}
        borderless={componentProps.borderless}
        editorRef={componentProps.editorRef}
        onHistoryChange={componentProps.onHistoryChange}
        onTransaction={componentProps.onTransaction}
        onKeyboardHistory={componentProps.onKeyboardHistory}
        baselineKey={componentProps.baselineKey}
        historyDepth={componentProps.historyDepth}
      />
      <FieldError hasError={hasError} errorMessage={errorMessage} helperText={resolved.helperText} />
    </Field.Root>
  ),
})
