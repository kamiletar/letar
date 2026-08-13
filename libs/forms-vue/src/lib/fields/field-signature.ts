import { defineComponent, h, type PropType } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'
import { useSignatureField } from '../core/use-signature-field'
import { fieldWrapper } from './field-utils'

/**
 * FieldSignature (headless) — canvas-подпись (рисование + typed-режим), `useSignatureField`
 * (`@letar/forms-vue/core`). Значение — data URI (PNG/SVG base64), пишется через
 * `form.setFieldValue` (composable вызван один раз в `setup()`, тот же принцип, что у
 * `usePinInputField`).
 */
export const FieldSignature = defineComponent({
  name: 'FieldSignature',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    width: { type: Number, required: false, default: 400 },
    height: { type: Number, required: false, default: 150 },
    strokeColor: { type: String, required: false, default: 'black' },
    strokeWidth: { type: Number, required: false, default: 2 },
    backgroundColor: { type: String, required: false, default: 'white' },
    clearLabel: { type: String, required: false, default: 'Очистить' },
    placeholder: { type: String, required: false, default: 'Подпишите здесь' },
    allowTyped: { type: Boolean, required: false, default: true },
    exportFormat: { type: String as PropType<'png' | 'svg'>, required: false, default: 'png' },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, required } = resolveFieldMeta(schema, props.name, props.label, undefined)

    const { canvasRef, mode, typedText, isEmpty, setMode, handleTypedInput, startDrawing, draw, stopDrawing, clear } =
      useSignatureField({
        width: props.width,
        height: props.height,
        strokeColor: props.strokeColor,
        strokeWidth: props.strokeWidth,
        backgroundColor: props.backgroundColor,
        exportFormat: props.exportFormat,
        onChange: (dataUrl) => form.setFieldValue(props.name, dataUrl),
      })

    return () =>
      withFieldValidation(form, props.name, fieldSchema, (field, hasError, errorMessage) =>
        fieldWrapper(
          { name: props.name, label, required, hasError, errorMessage },
          h('div', { class: 'letar-field__signature', style: `max-width:${props.width}px` }, [
            props.allowTyped
              ? h('div', { class: 'letar-field__signature-toolbar' }, [
                h('button', {
                  type: 'button',
                  'aria-pressed': mode.value === 'draw',
                  onClick: () => setMode('draw'),
                }, 'Рисовать'),
                h('button', {
                  type: 'button',
                  'aria-pressed': mode.value === 'typed',
                  onClick: () => setMode('typed'),
                }, 'Ввести текст'),
              ])
              : null,
            mode.value === 'typed'
              ? h('input', {
                type: 'text',
                class: 'letar-field__signature-typed-input',
                placeholder: 'Введите имя...',
                value: typedText.value,
                style: 'font-family:cursive;font-size:1.125rem',
                onInput: (e: Event) => handleTypedInput((e.target as HTMLInputElement).value),
              })
              : null,
            h('div', { style: 'position: relative' }, [
              h('canvas', {
                ref: canvasRef,
                width: props.width,
                height: props.height,
                role: 'img',
                'aria-label': 'Поле подписи',
                tabindex: 0,
                'data-field-name': props.name,
                style: `display:block;max-width:100%;cursor:${
                  mode.value === 'draw' ? 'crosshair' : 'default'
                };touch-action:none`,
                onMousedown: mode.value === 'draw' ? startDrawing : undefined,
                onMousemove: mode.value === 'draw' ? draw : undefined,
                onMouseup: mode.value === 'draw' ? stopDrawing : undefined,
                onMouseleave: mode.value === 'draw' ? stopDrawing : undefined,
                onTouchstart: mode.value === 'draw' ? startDrawing : undefined,
                onTouchmove: mode.value === 'draw' ? draw : undefined,
                onTouchend: mode.value === 'draw' ? stopDrawing : undefined,
                onBlur: field.handleBlur,
              }),
              isEmpty.value && mode.value === 'draw'
                ? h('div', { class: 'letar-field__signature-placeholder' }, props.placeholder)
                : null,
            ]),
            !isEmpty.value
              ? h('div', { class: 'letar-field__signature-actions' }, [
                h('button', {
                  type: 'button',
                  onClick: clear,
                }, props.clearLabel),
              ])
              : null,
          ]),
        ))
  },
})
