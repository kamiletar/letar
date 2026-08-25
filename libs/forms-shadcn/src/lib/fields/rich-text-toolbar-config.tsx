'use client'

import type { Editor } from '@tiptap/react'
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo,
} from 'lucide-react'
import type { ComponentType } from 'react'

/**
 * Доступные кнопки тулбара.
 *
 * Без `'image'` (в отличие от Chakra-версии) — beta-упрощение: `ImagePopover` с загрузкой файла
 * на сервер не портирован в этом заходе, см. README `FieldRichText`.
 */
export type ToolbarButton =
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

export const DEFAULT_TOOLBAR_BUTTONS: ToolbarButton[] = [
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

/**
 * `icon` — ссылка на компонент, не готовый JSX-элемент. `TOOLBAR_CONFIG` реэкспортится как
 * значение из барреля `@letar/forms-shadcn`, а не только через ленивый `import()` — модуль
 * исполняется при обычном статическом импорте, в т.ч. под tsx/esbuild (`nx db:seed`), где
 * `icon: <LuBold />` создавал бы элемент сразу при импорте и падал `ReferenceError: React is
 * not defined`. См. тот же фикс в Chakra-версии (`toolbar-config.tsx`) и
 * `document-field-base.tsx`. Размер иконки применяется в render (см. `ICON_SIZE`,
 * `field-rich-text-impl.tsx`), не хранится в конфиге.
 */
export interface ToolbarButtonConfig {
  icon: ComponentType<{ size?: number }>
  label: string
  action: (editor: Editor) => void
  isActive?: (editor: Editor) => boolean
}

export const ICON_SIZE = 14

export const TOOLBAR_CONFIG: Record<ToolbarButton, ToolbarButtonConfig> = {
  bold: {
    icon: Bold,
    label: 'Полужирный',
    action: (editor) => editor.chain().focus().toggleBold().run(),
    isActive: (editor) => editor.isActive('bold'),
  },
  italic: {
    icon: Italic,
    label: 'Курсив',
    action: (editor) => editor.chain().focus().toggleItalic().run(),
    isActive: (editor) => editor.isActive('italic'),
  },
  underline: {
    icon: UnderlineIcon,
    label: 'Подчёркнутый',
    action: (editor) => editor.chain().focus().toggleUnderline().run(),
    isActive: (editor) => editor.isActive('underline'),
  },
  strike: {
    icon: Strikethrough,
    label: 'Зачёркнутый',
    action: (editor) => editor.chain().focus().toggleStrike().run(),
    isActive: (editor) => editor.isActive('strike'),
  },
  code: {
    icon: Code,
    label: 'Код',
    action: (editor) => editor.chain().focus().toggleCode().run(),
    isActive: (editor) => editor.isActive('code'),
  },
  heading1: {
    icon: Heading1,
    label: 'Заголовок 1',
    action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: (editor) => editor.isActive('heading', { level: 1 }),
  },
  heading2: {
    icon: Heading2,
    label: 'Заголовок 2',
    action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: (editor) => editor.isActive('heading', { level: 2 }),
  },
  heading3: {
    icon: Heading3,
    label: 'Заголовок 3',
    action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    isActive: (editor) => editor.isActive('heading', { level: 3 }),
  },
  bulletList: {
    icon: List,
    label: 'Маркированный список',
    action: (editor) => editor.chain().focus().toggleBulletList().run(),
    isActive: (editor) => editor.isActive('bulletList'),
  },
  orderedList: {
    icon: ListOrdered,
    label: 'Нумерованный список',
    action: (editor) => editor.chain().focus().toggleOrderedList().run(),
    isActive: (editor) => editor.isActive('orderedList'),
  },
  blockquote: {
    icon: Quote,
    label: 'Цитата',
    action: (editor) => editor.chain().focus().toggleBlockquote().run(),
    isActive: (editor) => editor.isActive('blockquote'),
  },
  link: {
    icon: LinkIcon,
    label: 'Ссылка',
    // Beta: window.prompt вместо Popover-формы (см. Chakra LinkPopover) — тот же фолбэк,
    // что уже был в Chakra-конфиге кнопки на случай использования без Popover-обвязки.
    action: (editor) => {
      if (editor.isActive('link')) {
        editor.chain().focus().unsetLink().run()
        return
      }
      const url = window.prompt('URL ссылки')
      if (url) {
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
      }
    },
    isActive: (editor) => editor.isActive('link'),
  },
  undo: {
    icon: Undo,
    label: 'Отменить',
    action: (editor) => editor.chain().focus().undo().run(),
  },
  redo: {
    icon: Redo,
    label: 'Повторить',
    action: (editor) => editor.chain().focus().redo().run(),
  },
}
