import { type FileSecurityConfig, processFileWithSecurity } from '@letar/forms-core/security'
import { resolveFieldMeta, useAppFormContext, withFieldValidation } from '@letar/forms-vue/core'
import { cn } from '@letar/tailwind-utils'
import { defineComponent, h, type PropType, ref } from 'vue'
import { FieldWrapper } from '../uikit/primitives'
import { rekaUIKit } from '../uikit/uikit-reka'

/**
 * FieldFileUpload (Reka-скин) — та же нативная drag&drop-зона, что headless, стилизована
 * Tailwind. `processFileWithSecurity` переиспользован напрямую из `@letar/forms-core/security`.
 */
export const FieldFileUpload = defineComponent({
  name: 'FieldFileUpload',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    accept: { type: String, required: false, default: undefined },
    maxFiles: { type: Number, required: false, default: 1 },
    security: { type: Object as PropType<FileSecurityConfig>, required: false, default: undefined },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, required } = resolveFieldMeta(schema, props.name, props.label, undefined)

    const isDragOver = ref(false)
    const rejectionReason = ref('')
    const inputRef = ref<HTMLInputElement | null>(null)
    const renderError = ref<Error | null>(null)

    async function processFiles(fileList: FileList | File[]) {
      const incoming = Array.from(fileList).slice(0, props.maxFiles)
      const accepted: File[] = []
      for (const file of incoming) {
        if (props.security) {
          const result = await processFileWithSecurity(file, props.security)
          if (!result.valid) {
            rejectionReason.value = result.reason ?? 'Файл отклонён'
            continue
          }
          accepted.push(result.file)
        } else {
          accepted.push(file)
        }
      }
      if (accepted.length > 0) {
        rejectionReason.value = ''
      }
      const current = (form.getFieldValue(props.name) as File[] | undefined) ?? []
      const next = props.maxFiles === 1 ? accepted : [...current, ...accepted].slice(0, props.maxFiles)
      form.setFieldValue(props.name, next)
    }

    function removeFile(index: number) {
      const current = (form.getFieldValue(props.name) as File[] | undefined) ?? []
      form.setFieldValue(
        props.name,
        current.filter((_, i) => i !== index),
      )
    }

    return () => {
      if (renderError.value) {
        return rekaUIKit.ErrorFallback({ fieldName: props.name, message: renderError.value.message })
      }

      return withFieldValidation(form, props.name, fieldSchema, (field, hasError, errorMessage) => {
        const files = (field.state.value as File[] | undefined) ?? []

        return FieldWrapper({
          label,
          required,
          hasError,
          errorMessage,
          children: h('div', { class: 'space-y-2' }, [
            h(
              'div',
              {
                class: cn(
                  'flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-input p-6 text-center text-muted-foreground text-sm',
                  isDragOver.value && 'border-ring bg-accent',
                ),
                'data-drag-over': isDragOver.value,
                'data-field-name': props.name,
                onClick: () => inputRef.value?.click(),
                onDragover: (e: DragEvent) => {
                  e.preventDefault()
                  isDragOver.value = true
                },
                onDragleave: () => {
                  isDragOver.value = false
                },
                onDrop: (e: DragEvent) => {
                  e.preventDefault()
                  isDragOver.value = false
                  if (e.dataTransfer?.files) {
                    void processFiles(e.dataTransfer.files)
                  }
                },
              },
              [
                h('input', {
                  ref: inputRef,
                  type: 'file',
                  accept: props.accept,
                  multiple: props.maxFiles > 1,
                  class: 'hidden',
                  'data-field-name': props.name,
                  onChange: (e: Event) => {
                    const input = e.target as HTMLInputElement
                    if (input.files) {
                      void processFiles(input.files)
                    }
                    input.value = ''
                  },
                  onBlur: field.handleBlur,
                }),
                h('span', {}, 'Перетащите файл сюда или нажмите для выбора'),
              ],
            ),
            rejectionReason.value
              ? h(
                'p',
                { class: 'text-destructive text-sm', role: 'alert', 'data-testid': 'file-rejection' },
                rejectionReason.value,
              )
              : null,
            files.length > 0
              ? h(
                'ul',
                { class: 'space-y-1' },
                files.map((file, index) =>
                  h('li', {
                    key: file.name + index,
                    class: 'flex items-center justify-between gap-2 text-sm',
                    'data-testid': 'file-item',
                  }, [
                    h('span', {}, file.name),
                    h('button', {
                      type: 'button',
                      'aria-label': `Удалить ${file.name}`,
                      class: 'text-muted-foreground hover:text-destructive',
                      onClick: () => removeFile(index),
                    }, '✕'),
                  ])
                ),
              )
              : null,
          ]),
        })
      })
    }
  },
})
