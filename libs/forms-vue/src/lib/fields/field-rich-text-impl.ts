import { EditorContent } from '@tiptap/vue-3'
import { defineComponent, h, type PropType } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'
import {
  DEFAULT_RICH_TEXT_BUTTONS,
  RICH_TEXT_ACTIONS,
  RICH_TEXT_BUTTON_LABELS,
  type RichTextButton,
} from '../core/rich-text-actions'
import { useRichTextField } from '../core/use-rich-text-field'
import { fieldWrapper } from './field-utils'

export interface RichTextFieldProps {
  name: string
  label?: string
  placeholder?: string
  minHeight?: string | number
  maxHeight?: string | number
  showToolbar?: boolean
  toolbarButtons?: RichTextButton[]
  outputFormat?: 'html' | 'json'
}

export type { RichTextButton }

/** Headless-пакет не тянет иконку-либу — кнопки на текстовых глифах, как `FieldRating` (★/☆). */
const GLYPH: Record<RichTextButton, string> = {
  bold: 'B',
  italic: 'I',
  underline: 'U',
  strike: 'S',
  code: '{}',
  heading1: 'H1',
  heading2: 'H2',
  heading3: 'H3',
  bulletList: '•',
  orderedList: '1.',
  blockquote: '❝',
  link: '🔗',
  undo: '↶',
  redo: '↷',
}

function toCssSize(value: string | number | undefined): string | undefined {
  if (value === undefined) {
    return undefined
  }
  return typeof value === 'number' ? `${value}px` : value
}

/**
 * FieldRichText (headless) — WYSIWYG-редактор на Tiptap (`@tiptap/vue-3`), реализация
 * (загружается лениво — см. `field-rich-text.ts`). Vue-аналог React
 * `libs/forms/src/lib/declarative/form-fields/text/field-rich-text-impl.tsx`, упрощён по тому же
 * принципу, что уже принят в React `forms-shadcn` (Фаза 7.6): без `imageUpload`/`ImagePopover`,
 * кнопка `link` — `window.prompt` вместо Popover-формы.
 */
export const FieldRichText = defineComponent({
  name: 'FieldRichText',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    placeholder: { type: String, required: false, default: undefined },
    minHeight: { type: [String, Number], required: false, default: '150px' },
    maxHeight: { type: [String, Number], required: false, default: undefined },
    showToolbar: { type: Boolean, required: false, default: true },
    toolbarButtons: {
      type: Array as PropType<RichTextButton[]>,
      required: false,
      default: () => DEFAULT_RICH_TEXT_BUTTONS,
    },
    outputFormat: { type: String as PropType<'html' | 'json'>, required: false, default: 'html' },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, placeholder, required, fullPath } = resolveFieldMeta(
      schema,
      props.name,
      props.label,
      props.placeholder,
    )

    const { editor } = useRichTextField({
      getValue: () => (form.getFieldValue(props.name) as string | undefined) ?? '',
      onChange: (value) => form.setFieldValue(props.name, value),
      placeholder,
      outputFormat: props.outputFormat,
    })

    return () =>
      withFieldValidation(form, fullPath, fieldSchema, (field, hasError, errorMessage) => {
        const instance = editor.value

        return fieldWrapper(
          { name: props.name, label, required, hasError, errorMessage },
          h(
            'div',
            {
              class: 'letar-field__richtext',
              'data-field-name': props.name,
              onFocusout: field.handleBlur,
            },
            [
              instance && props.showToolbar
                ? h(
                  'div',
                  { class: 'letar-field__richtext-toolbar', role: 'toolbar' },
                  props.toolbarButtons.map((button) => {
                    const action = RICH_TEXT_ACTIONS[button]
                    const isActive = action.isActive?.(instance) ?? false

                    return h('button', {
                      key: button,
                      type: 'button',
                      'aria-label': RICH_TEXT_BUTTON_LABELS[button],
                      'aria-pressed': isActive,
                      'data-active': isActive,
                      class: 'letar-field__richtext-btn',
                      onClick: () => action.run(instance),
                    }, GLYPH[button])
                  }),
                )
                : null,
              h(
                'div',
                {
                  class: 'letar-field__richtext-content',
                  style: {
                    minHeight: toCssSize(props.minHeight),
                    maxHeight: toCssSize(props.maxHeight),
                    overflowY: props.maxHeight ? 'auto' : undefined,
                  },
                },
                instance ? [h(EditorContent, { editor: instance })] : [],
              ),
            ],
          ),
        )
      })
  },
})
