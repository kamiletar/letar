import { type FileSecurityConfig, processFileWithSecurity } from '@letar/forms-core/security'
import { defineComponent, h, type PropType, ref } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'
import { fieldWrapper } from './field-utils'

/**
 * FieldFileUpload (headless) — нативный `<input type="file">` + drag&drop-зона вместо Ark UI
 * `FileUpload.Root` (Chakra-версия, `libs/forms/.../field-file-upload.tsx`, 337 строк с превью
 * изображений). Форма хранит `File[]` (при `maxFiles: 1` — массив из одного файла, не голый
 * `File`, для единообразия API). Безопасность — тот же `processFileWithSecurity`
 * (`@letar/forms-core/security`), что и в Chakra-скине: framework-agnostic, порт не потребовался.
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

    return () =>
      withFieldValidation(form, props.name, fieldSchema, (field, hasError, errorMessage) => {
        const files = (field.state.value as File[] | undefined) ?? []

        return fieldWrapper(
          { name: props.name, label, required, hasError, errorMessage },
          h('div', {}, [
            h(
              'div',
              {
                class: 'letar-field__dropzone',
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
                  class: 'letar-field__dropzone-input',
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
                { class: 'letar-field__error', role: 'alert', 'data-testid': 'file-rejection' },
                rejectionReason.value,
              )
              : null,
            files.length > 0
              ? h(
                'ul',
                { class: 'letar-field__file-list' },
                files.map((file, index) =>
                  h('li', { key: file.name + index, class: 'letar-field__file-item' }, [
                    h('span', {}, file.name),
                    h('button', {
                      type: 'button',
                      'aria-label': `Удалить ${file.name}`,
                      onClick: () => removeFile(index),
                    }, '✕'),
                  ])
                ),
              )
              : null,
          ]),
        )
      })
  },
})
