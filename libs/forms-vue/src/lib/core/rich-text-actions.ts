import type { Editor } from '@tiptap/vue-3'

/**
 * Доступные кнопки тулбара `FieldRichText`. Без `'image'` (в отличие от Chakra-версии) — тот же
 * beta-скоуп, что уже принят у React `forms-shadcn`: `ImagePopover` с загрузкой файла на сервер
 * не портирован.
 */
export type RichTextButton =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'code'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bulletList'
  | 'orderedList'
  | 'blockquote'
  | 'link'
  | 'undo'
  | 'redo'

export const DEFAULT_RICH_TEXT_BUTTONS: RichTextButton[] = [
  'bold',
  'italic',
  'underline',
  'strike',
  'code',
  'heading1',
  'heading2',
  'heading3',
  'bulletList',
  'orderedList',
  'blockquote',
  'link',
  'undo',
  'redo',
]

export interface RichTextButtonAction {
  run: (editor: Editor) => void
  isActive?: (editor: Editor) => boolean
}

/**
 * Чистая логика кнопок тулбара (без иконки/подписи — те специфичны скину), общая для headless
 * и Reka-скина. Та же дедупликация, что у `useMaskField`/`usePinInputField`/`useCreditCardField` —
 * `editor.chain()...run()` не имеет Vue-специфики и незачем дублировать в двух пакетах.
 */
export const RICH_TEXT_ACTIONS: Record<RichTextButton, RichTextButtonAction> = {
  bold: { run: (e) => e.chain().focus().toggleBold().run(), isActive: (e) => e.isActive('bold') },
  italic: { run: (e) => e.chain().focus().toggleItalic().run(), isActive: (e) => e.isActive('italic') },
  underline: { run: (e) => e.chain().focus().toggleUnderline().run(), isActive: (e) => e.isActive('underline') },
  strike: { run: (e) => e.chain().focus().toggleStrike().run(), isActive: (e) => e.isActive('strike') },
  code: { run: (e) => e.chain().focus().toggleCode().run(), isActive: (e) => e.isActive('code') },
  heading1: {
    run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: (e) => e.isActive('heading', { level: 1 }),
  },
  heading2: {
    run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: (e) => e.isActive('heading', { level: 2 }),
  },
  heading3: {
    run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
    isActive: (e) => e.isActive('heading', { level: 3 }),
  },
  bulletList: {
    run: (e) => e.chain().focus().toggleBulletList().run(),
    isActive: (e) => e.isActive('bulletList'),
  },
  orderedList: {
    run: (e) => e.chain().focus().toggleOrderedList().run(),
    isActive: (e) => e.isActive('orderedList'),
  },
  blockquote: {
    run: (e) => e.chain().focus().toggleBlockquote().run(),
    isActive: (e) => e.isActive('blockquote'),
  },
  link: {
    // window.prompt вместо Popover-формы — тот же фолбэк, что уже принят в React `forms-shadcn`.
    run: (e) => {
      if (e.isActive('link')) {
        e.chain().focus().unsetLink().run()
        return
      }
      const url = window.prompt('URL ссылки')
      if (url) {
        e.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
      }
    },
    isActive: (e) => e.isActive('link'),
  },
  undo: { run: (e) => e.chain().focus().undo().run() },
  redo: { run: (e) => e.chain().focus().redo().run() },
}

export const RICH_TEXT_BUTTON_LABELS: Record<RichTextButton, string> = {
  bold: 'Полужирный',
  italic: 'Курсив',
  underline: 'Подчёркнутый',
  strike: 'Зачёркнутый',
  code: 'Код',
  heading1: 'Заголовок 1',
  heading2: 'Заголовок 2',
  heading3: 'Заголовок 3',
  bulletList: 'Маркированный список',
  orderedList: 'Нумерованный список',
  blockquote: 'Цитата',
  link: 'Ссылка',
  undo: 'Отменить',
  redo: 'Повторить',
}
