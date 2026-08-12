'use client'

import { cn } from '@letar/tailwind-utils'
import TiptapLink from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import { type Content, EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import type { ReactElement } from 'react'
import { useEffect, useMemo } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { DEFAULT_TOOLBAR_BUTTONS, TOOLBAR_CONFIG, type ToolbarButton } from './rich-text-toolbar-config'
import type { RichTextFieldProps } from './types'

/** Безопасный парсинг JSON — не роняет редактор на битом значении из БД */
function safeParseJSON(value: string): Content {
  try {
    return JSON.parse(value) as Content
  } catch {
    console.warn('FieldRichText: некорректный JSON, используется пустой документ')
    return ''
  }
}

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  placeholder?: string
  minHeight: string | number
  maxHeight?: string | number
  showToolbar: boolean
  toolbarButtons: ToolbarButton[]
  outputFormat: 'html' | 'json'
  disabled?: boolean
  readOnly?: boolean
  hasError?: boolean
  fieldName: string
}

/** Внутренний Tiptap-редактор — отдельный компонент, а не хук в `render`: `useEditor` живёт по
 * правилам React-хуков в собственном дереве, композиционный слой поля хуков в `render` не ждёт. */
function RichTextEditor({
  value,
  onChange,
  onBlur,
  placeholder,
  minHeight,
  maxHeight,
  showToolbar,
  toolbarButtons,
  outputFormat,
  disabled,
  readOnly,
  hasError,
  fieldName,
}: RichTextEditorProps): ReactElement | null {
  const extensions = useMemo(
    () => [
      StarterKit,
      Underline,
      TiptapLink.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      Placeholder.configure({ placeholder: placeholder ?? 'Начните вводить текст...' }),
    ],
    [placeholder],
  )

  const editor = useEditor({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- версия @tiptap/core расходится по номинальному типу
    extensions: extensions as any[],
    content: outputFormat === 'json' && value ? safeParseJSON(value) : value || '',
    editable: !disabled && !readOnly,
    onUpdate: ({ editor }) => {
      onChange(outputFormat === 'json' ? JSON.stringify(editor.getJSON()) : editor.getHTML())
    },
    onBlur: () => onBlur(),
    immediatelyRender: false,
  })

  // Синхронизация внешних изменений value (не трогаем курсор, если контент не изменился)
  useEffect(() => {
    if (!editor) { return }
    const currentContent = outputFormat === 'json' ? JSON.stringify(editor.getJSON()) : editor.getHTML()
    if (value !== currentContent) {
      const content = outputFormat === 'json' && value ? safeParseJSON(value) : value || ''
      editor.commands.setContent(content, { emitUpdate: false })
    }
  }, [editor, value, outputFormat])

  useEffect(() => {
    editor?.setEditable(!disabled && !readOnly)
  }, [editor, disabled, readOnly])

  if (!editor) { return null }

  return (
    <div
      data-field-name={fieldName}
      className={cn(
        'border-input overflow-hidden rounded-md border',
        'focus-within:ring-ring/50 focus-within:ring-[3px]',
        hasError && 'border-destructive focus-within:ring-destructive/20',
      )}
    >
      {showToolbar && !readOnly && (
        <div className="bg-muted/50 flex flex-wrap items-center gap-0.5 border-b p-1">
          {toolbarButtons.map((button) => {
            const config = TOOLBAR_CONFIG[button]
            const isActive = config.isActive?.(editor) ?? false
            return (
              <button
                key={button}
                type="button"
                aria-label={config.label}
                aria-pressed={isActive}
                disabled={disabled}
                onClick={() => config.action(editor)}
                className={cn(
                  'hover:bg-accent hover:text-accent-foreground inline-flex size-7 items-center justify-center rounded',
                  'disabled:pointer-events-none disabled:opacity-50',
                  isActive && 'bg-secondary text-secondary-foreground',
                )}
              >
                {config.icon}
              </button>
            )
          })}
        </div>
      )}
      <div
        className={cn(
          'overflow-y-auto p-3 text-sm',
          '[&_.tiptap]:outline-none',
          '[&_.tiptap_h1]:mt-4 [&_.tiptap_h1]:mb-2 [&_.tiptap_h1]:text-xl [&_.tiptap_h1]:font-bold',
          '[&_.tiptap_h2]:mt-4 [&_.tiptap_h2]:mb-2 [&_.tiptap_h2]:text-lg [&_.tiptap_h2]:font-bold',
          '[&_.tiptap_h3]:mt-4 [&_.tiptap_h3]:mb-2 [&_.tiptap_h3]:text-base [&_.tiptap_h3]:font-semibold',
          '[&_.tiptap_ul]:my-2 [&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-6',
          '[&_.tiptap_ol]:my-2 [&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-6',
          '[&_.tiptap_blockquote]:border-l-2 [&_.tiptap_blockquote]:pl-3 [&_.tiptap_blockquote]:italic',
          '[&_.tiptap_blockquote]:text-muted-foreground [&_.tiptap_blockquote]:border-border',
          '[&_.tiptap_code]:bg-muted [&_.tiptap_code]:rounded [&_.tiptap_code]:px-1 [&_.tiptap_code]:py-0.5',
          '[&_.tiptap_code]:font-mono [&_.tiptap_code]:text-xs',
          '[&_.tiptap_a]:text-primary [&_.tiptap_a]:cursor-pointer [&_.tiptap_a]:underline',
          '[&_.tiptap_p]:my-1',
          '[&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground',
          '[&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none',
          '[&_.tiptap_p.is-editor-empty:first-child::before]:float-left',
          '[&_.tiptap_p.is-editor-empty:first-child::before]:h-0',
          '[&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
        )}
        style={{
          minHeight: typeof minHeight === 'number' ? `${minHeight}px` : minHeight,
          maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight,
          overflowY: maxHeight ? 'auto' : undefined,
        }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

/**
 * Form.Field.RichText — shadcn-скин, реализация (загружается лениво — см. field-rich-text.tsx).
 * WYSIWYG-редактор на Tiptap с тулбаром.
 *
 * Портировано из Chakra-версии почти без изменений домена (те же extensions/`onUpdate`/
 * синхронизация `value`), обвязка — своя (native `<button>`-тулбар вместо `IconButton`/`HStack`).
 *
 * Beta-упрощения относительно Chakra-версии:
 * - без `imageUpload`/`ImagePopover` — вставка изображений с загрузкой на сервер не портирована;
 * - кнопка `link` — `window.prompt` вместо Popover-формы (тот же фолбэк, что уже был в
 *   Chakra-конфиге кнопки на случай использования без отдельного `LinkPopover`).
 */
export const FieldRichText = createField<RichTextFieldProps, string>({
  displayName: 'FieldRichText',
  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => {
    const {
      minHeight = '150px',
      maxHeight,
      showToolbar = true,
      toolbarButtons = DEFAULT_TOOLBAR_BUTTONS,
      outputFormat = 'html',
    } = componentProps

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        <RichTextEditor
          value={(field.state.value as string) ?? ''}
          onChange={(value) => field.handleChange(value)}
          onBlur={field.handleBlur}
          placeholder={resolved.placeholder}
          minHeight={minHeight}
          maxHeight={maxHeight}
          showToolbar={showToolbar}
          toolbarButtons={toolbarButtons}
          outputFormat={outputFormat}
          disabled={resolved.disabled}
          readOnly={resolved.readOnly}
          hasError={hasError}
          fieldName={fullPath}
        />
      </FieldWrapper>
    )
  },
})
