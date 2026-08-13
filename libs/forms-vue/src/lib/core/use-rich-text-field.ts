import Placeholder from '@tiptap/extension-placeholder'
import StarterKit from '@tiptap/starter-kit'
import { type Content, type Editor, useEditor } from '@tiptap/vue-3'
import { type ShallowRef, watch } from 'vue'

export type RichTextOutputFormat = 'html' | 'json'

export interface UseRichTextFieldOptions {
  getValue: () => string
  onChange: (value: string) => void
  placeholder?: string
  outputFormat?: RichTextOutputFormat
}

export interface UseRichTextFieldResult {
  editor: ShallowRef<Editor | undefined>
}

/** Безопасный парсинг JSON — не роняет редактор на битом значении из БД. */
function safeParseJSON(value: string): Content {
  try {
    return JSON.parse(value) as Content
  } catch {
    console.warn('FieldRichText: некорректный JSON, используется пустой документ')
    return ''
  }
}

/**
 * Общий Tiptap-редактор для `FieldRichText` обоих Vue-скинов (Этап 5, завершение) — extensions,
 * синхронизация внешнего `value` и парсинг JSON одинаковы, различается только разметка тулбара
 * и обёртки поля. Тот же принцип дедупликации, что у `useMaskField`/`usePinInputField`/
 * `useCreditCardField`. Вызывать один раз в `setup()`, как и остальные composable ядра.
 *
 * `field.handleBlur` сюда намеренно не пробрасывается — DOM-фокус contenteditable-редактора
 * недоступен из `setup()` (у `form.Field` он приходит только в scoped-слоте render), поэтому
 * blur-обработчик вешается на обёртку поля в render через `onFocusout` (`focusout` в отличие от
 * `blur` всплывает).
 */
export function useRichTextField(options: UseRichTextFieldOptions): UseRichTextFieldResult {
  const outputFormat = options.outputFormat ?? 'html'
  const initial = options.getValue()

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
        },
      }),
      Placeholder.configure({ placeholder: options.placeholder ?? 'Начните вводить текст...' }),
    ],
    content: outputFormat === 'json' && initial ? safeParseJSON(initial) : initial || '',
    onUpdate: ({ editor }) => {
      options.onChange(outputFormat === 'json' ? JSON.stringify(editor.getJSON()) : editor.getHTML())
    },
  })

  // Синхронизация внешних изменений value (программный reset формы и т.п.) — не трогаем курсор,
  // если контент фактически не изменился.
  watch(options.getValue, (value) => {
    const instance = editor.value
    if (!instance) {
      return
    }
    const currentContent = outputFormat === 'json' ? JSON.stringify(instance.getJSON()) : instance.getHTML()
    if (value !== currentContent) {
      const content = outputFormat === 'json' && value ? safeParseJSON(value) : value || ''
      instance.commands.setContent(content, { emitUpdate: false })
    }
  })

  return { editor }
}
