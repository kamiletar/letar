'use client'

import type { useEditor } from '@tiptap/react'
import type { ReactNode } from 'react'
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
 */
export interface ToolbarButtonConfig {
  icon: ReactNode
  label: string
  action: (editor: ReturnType<typeof useEditor>) => void
  isActive?: (editor: ReturnType<typeof useEditor>) => boolean
}

/**
 * Конфигурация всех кнопок тулбара
 */
export const TOOLBAR_CONFIG: Record<ToolbarButton, ToolbarButtonConfig> = {
  bold: {
    icon: <LuBold />,
    label: 'Bold',
    action: (editor) => editor?.chain().focus().toggleBold().run(),
    isActive: (editor) => editor?.isActive('bold') ?? false,
  },
  italic: {
    icon: <LuItalic />,
    label: 'Italic',
    action: (editor) => editor?.chain().focus().toggleItalic().run(),
    isActive: (editor) => editor?.isActive('italic') ?? false,
  },
  underline: {
    icon: <LuUnderline />,
    label: 'Подчёркнутый',
    action: (editor) => editor?.chain().focus().toggleUnderline().run(),
    isActive: (editor) => editor?.isActive('underline') ?? false,
  },
  strike: {
    icon: <LuStrikethrough />,
    label: 'Strikethrough',
    action: (editor) => editor?.chain().focus().toggleStrike().run(),
    isActive: (editor) => editor?.isActive('strike') ?? false,
  },
  code: {
    icon: <LuCode />,
    label: 'Код',
    action: (editor) => editor?.chain().focus().toggleCode().run(),
    isActive: (editor) => editor?.isActive('code') ?? false,
  },
  heading1: {
    icon: <LuHeading1 />,
    label: 'Заголовок 1',
    action: (editor) => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: (editor) => editor?.isActive('heading', { level: 1 }) ?? false,
  },
  heading2: {
    icon: <LuHeading2 />,
    label: 'Заголовок 2',
    action: (editor) => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: (editor) => editor?.isActive('heading', { level: 2 }) ?? false,
  },
  heading3: {
    icon: <LuHeading3 />,
    label: 'Заголовок 3',
    action: (editor) => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
    isActive: (editor) => editor?.isActive('heading', { level: 3 }) ?? false,
  },
  bulletList: {
    icon: <LuList />,
    label: 'Bullet list',
    action: (editor) => editor?.chain().focus().toggleBulletList().run(),
    isActive: (editor) => editor?.isActive('bulletList') ?? false,
  },
  orderedList: {
    icon: <LuListOrdered />,
    label: 'Ordered list',
    action: (editor) => editor?.chain().focus().toggleOrderedList().run(),
    isActive: (editor) => editor?.isActive('orderedList') ?? false,
  },
  blockquote: {
    icon: <LuQuote />,
    label: 'Quote',
    action: (editor) => editor?.chain().focus().toggleBlockquote().run(),
    isActive: (editor) => editor?.isActive('blockquote') ?? false,
  },
  link: {
    icon: <LuLink />,
    label: 'Ссылка',
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
    icon: <LuUndo />,
    label: 'Undo',
    action: (editor) => editor?.chain().focus().undo().run(),
  },
  redo: {
    icon: <LuRedo />,
    label: 'Redo',
    action: (editor) => editor?.chain().focus().redo().run(),
  },
  // Кнопка image processesся отдельно через ImagePopover (аналогично link)
  image: {
    icon: <LuImage />,
    label: 'Insert image',
    action: () => {
      // Action handled via ImagePopover
    },
  },
}
