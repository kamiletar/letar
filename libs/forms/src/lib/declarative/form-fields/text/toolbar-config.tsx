'use client'

import type { ToolbarStringKey } from '@letar/forms-react'
import type { useEditor } from '@tiptap/react'
import type { ComponentType } from 'react'
import {
  LuBold,
  LuCode,
  LuHeading1,
  LuHeading2,
  LuHeading3,
  LuImage,
  LuItalic,
  LuLink,
  LuList,
  LuListOrdered,
  LuQuote,
  LuRedo,
  LuStrikethrough,
  LuUnderline,
  LuUndo,
} from 'react-icons/lu'

/**
 * Доступные кнопки toolbar
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
  | 'image'
  | 'undo'
  | 'redo'

/**
 * Buttons тулбара by default
 */
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
 * Конфигурация кнопки toolbar
 *
 * ⚠️ `icon` — ссылка на компонент, не готовый JSX-элемент (`<LuBold />` создавался бы сразу при
 * загрузке модуля, до всякого рендера — падает `ReferenceError: React is not defined` при импорте
 * под `tsx`/esbuild, см. комментарий в `create-lazy-component.tsx`). `TOOLBAR_CONFIG` реэкспортится
 * как значение из `form-fields/index.ts`, а не только через ленивый `import()`, поэтому модуль
 * исполняется при обычном статическом импорте `@letar/forms` (в т.ч. из `prisma/seed.ts`).
 *
 * `labelKey` — ключ словаря `formToolbar.*` (`@letar/forms-react`), не готовый текст: подпись
 * резолвится в месте рендера кнопки (`resolveToolbarString`), общий словарь на оба скина —
 * см. `toolbar-strings.ts`.
 */
export interface ToolbarButtonConfig {
  icon: ComponentType
  labelKey: ToolbarStringKey
  action: (editor: ReturnType<typeof useEditor>) => void
  isActive?: (editor: ReturnType<typeof useEditor>) => boolean
}

/**
 * Конфигурация всех кнопок тулбара
 */
export const TOOLBAR_CONFIG: Record<ToolbarButton, ToolbarButtonConfig> = {
  bold: {
    icon: LuBold,
    labelKey: 'formToolbar.bold',
    action: (editor) => editor?.chain().focus().toggleBold().run(),
    isActive: (editor) => editor?.isActive('bold') ?? false,
  },
  italic: {
    icon: LuItalic,
    labelKey: 'formToolbar.italic',
    action: (editor) => editor?.chain().focus().toggleItalic().run(),
    isActive: (editor) => editor?.isActive('italic') ?? false,
  },
  underline: {
    icon: LuUnderline,
    labelKey: 'formToolbar.underline',
    action: (editor) => editor?.chain().focus().toggleUnderline().run(),
    isActive: (editor) => editor?.isActive('underline') ?? false,
  },
  strike: {
    icon: LuStrikethrough,
    labelKey: 'formToolbar.strike',
    action: (editor) => editor?.chain().focus().toggleStrike().run(),
    isActive: (editor) => editor?.isActive('strike') ?? false,
  },
  code: {
    icon: LuCode,
    labelKey: 'formToolbar.code',
    action: (editor) => editor?.chain().focus().toggleCode().run(),
    isActive: (editor) => editor?.isActive('code') ?? false,
  },
  heading1: {
    icon: LuHeading1,
    labelKey: 'formToolbar.heading1',
    action: (editor) => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: (editor) => editor?.isActive('heading', { level: 1 }) ?? false,
  },
  heading2: {
    icon: LuHeading2,
    labelKey: 'formToolbar.heading2',
    action: (editor) => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: (editor) => editor?.isActive('heading', { level: 2 }) ?? false,
  },
  heading3: {
    icon: LuHeading3,
    labelKey: 'formToolbar.heading3',
    action: (editor) => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
    isActive: (editor) => editor?.isActive('heading', { level: 3 }) ?? false,
  },
  bulletList: {
    icon: LuList,
    labelKey: 'formToolbar.bulletList',
    action: (editor) => editor?.chain().focus().toggleBulletList().run(),
    isActive: (editor) => editor?.isActive('bulletList') ?? false,
  },
  orderedList: {
    icon: LuListOrdered,
    labelKey: 'formToolbar.orderedList',
    action: (editor) => editor?.chain().focus().toggleOrderedList().run(),
    isActive: (editor) => editor?.isActive('orderedList') ?? false,
  },
  blockquote: {
    icon: LuQuote,
    labelKey: 'formToolbar.blockquote',
    action: (editor) => editor?.chain().focus().toggleBlockquote().run(),
    isActive: (editor) => editor?.isActive('blockquote') ?? false,
  },
  link: {
    icon: LuLink,
    labelKey: 'formToolbar.link',
    action: (editor) => {
      if (editor?.isActive('link')) {
        editor.chain().focus().unsetLink().run()
      } else {
        const url = window.prompt('URL')
        if (url) {
          editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
        }
      }
    },
    isActive: (editor) => editor?.isActive('link') ?? false,
  },
  undo: {
    icon: LuUndo,
    labelKey: 'formToolbar.undo',
    action: (editor) => editor?.chain().focus().undo().run(),
  },
  redo: {
    icon: LuRedo,
    labelKey: 'formToolbar.redo',
    action: (editor) => editor?.chain().focus().redo().run(),
  },
  // Кнопка image processesся отдельно через ImagePopover (аналогично link)
  image: {
    icon: LuImage,
    labelKey: 'formToolbar.image',
    action: () => {
      // Action handled via ImagePopover
    },
  },
}
