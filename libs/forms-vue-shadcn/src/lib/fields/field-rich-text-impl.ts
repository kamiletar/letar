import {
  DEFAULT_RICH_TEXT_BUTTONS,
  resolveFieldMeta,
  RICH_TEXT_ACTIONS,
  type RichTextButton,
  useAppFormContext,
  useRichTextField,
  withFieldValidation,
} from '@letar/forms-vue/core'
import { cn } from '@letar/tailwind-utils'
import { EditorContent } from '@tiptap/vue-3'
import { defineComponent, h, onErrorCaptured, type PropType, ref } from 'vue'
import { FieldWrapper } from '../uikit/primitives'
import { rekaUIKit } from '../uikit/uikit-reka'
import { ICON_SIZE, RICH_TEXT_BUTTON_LABELS, RICH_TEXT_ICONS } from './rich-text-toolbar-config'

function toCssSize(value: string | number | undefined): string | undefined {
  if (value === undefined) {
    return undefined
  }
  return typeof value === 'number' ? `${value}px` : value
}

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

/**
 * FieldRichText (Reka-скин) — WYSIWYG-редактор на Tiptap, реализация (загружается лениво — см.
 * `field-rich-text.ts`). Переиспользует `useRichTextField` из `@letar/forms-vue/core` (тот же
 * Tiptap-редактор, что у headless-версии) — здесь только Tailwind-разметка и иконки
 * `lucide-vue-next` вместо текстовых глифов.
 *
 * Beta-упрощения, унаследованные от React `forms-shadcn`: без `imageUpload`/`ImagePopover`,
 * кнопка `link` — `window.prompt`.
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
    const { fieldSchema, label, placeholder, required } = resolveFieldMeta(
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

    const renderError = ref<Error | null>(null)
    onErrorCaptured((error) => {
      renderError.value = error instanceof Error ? error : new Error(String(error))
      console.error(`[@letar/forms-vue-shadcn] Ошибка в поле "${props.name}":`, error)
      return false
    })

    return () => {
      if (renderError.value) {
        return rekaUIKit.ErrorFallback({ fieldName: props.name, message: renderError.value.message })
      }

      return withFieldValidation(form, props.name, fieldSchema, (field, hasError, errorMessage) => {
        const instance = editor.value

        return FieldWrapper({
          label,
          required,
          hasError,
          errorMessage,
          children: h(
            'div',
            {
              'data-field-name': props.name,
              onFocusout: field.handleBlur,
              class: cn(
                'overflow-hidden rounded-md border border-input',
                'focus-within:ring-[3px] focus-within:ring-ring/50',
                hasError && 'border-destructive focus-within:ring-destructive/20',
              ),
            },
            [
              instance && props.showToolbar
                ? h(
                  'div',
                  { class: 'flex flex-wrap items-center gap-0.5 border-b bg-muted/50 p-1' },
                  props.toolbarButtons.map((button) => {
                    const action = RICH_TEXT_ACTIONS[button]
                    const isActive = action.isActive?.(instance) ?? false
                    const Icon = RICH_TEXT_ICONS[button]

                    return h('button', {
                      key: button,
                      type: 'button',
                      'aria-label': RICH_TEXT_BUTTON_LABELS[button],
                      'aria-pressed': isActive,
                      onClick: () => action.run(instance),
                      class: cn(
                        'inline-flex size-7 items-center justify-center rounded hover:bg-accent hover:text-accent-foreground',
                        isActive && 'bg-secondary text-secondary-foreground',
                      ),
                    }, [h(Icon, { size: ICON_SIZE })])
                  }),
                )
                : null,
              h(
                'div',
                {
                  class: cn(
                    'overflow-y-auto p-3 text-sm',
                    '[&_.tiptap]:outline-none',
                    '[&_.tiptap_h1]:mt-4 [&_.tiptap_h1]:mb-2 [&_.tiptap_h1]:text-xl [&_.tiptap_h1]:font-bold',
                    '[&_.tiptap_h2]:mt-4 [&_.tiptap_h2]:mb-2 [&_.tiptap_h2]:text-lg [&_.tiptap_h2]:font-bold',
                    '[&_.tiptap_h3]:mt-4 [&_.tiptap_h3]:mb-2 [&_.tiptap_h3]:text-base [&_.tiptap_h3]:font-semibold',
                    '[&_.tiptap_ul]:my-2 [&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-6',
                    '[&_.tiptap_ol]:my-2 [&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-6',
                    '[&_.tiptap_blockquote]:border-border [&_.tiptap_blockquote]:border-l-2 [&_.tiptap_blockquote]:pl-3 [&_.tiptap_blockquote]:italic [&_.tiptap_blockquote]:text-muted-foreground',
                    '[&_.tiptap_code]:rounded [&_.tiptap_code]:bg-muted [&_.tiptap_code]:px-1 [&_.tiptap_code]:py-0.5 [&_.tiptap_code]:font-mono [&_.tiptap_code]:text-xs',
                    '[&_.tiptap_a]:cursor-pointer [&_.tiptap_a]:text-primary [&_.tiptap_a]:underline',
                    '[&_.tiptap_p]:my-1',
                    '[&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:h-0 [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground',
                  ),
                  style: {
                    minHeight: toCssSize(props.minHeight),
                    maxHeight: toCssSize(props.maxHeight),
                  },
                },
                instance ? [h(EditorContent, { editor: instance })] : [],
              ),
            ],
          ),
        })
      })
    }
  },
})
