import { RICH_TEXT_BUTTON_LABELS, type RichTextButton } from '@letar/forms-vue/core'
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
} from 'lucide-vue-next'
import type { Component } from 'vue'

const ICON_SIZE = 14

/** Иконка `lucide-vue-next` на каждую кнопку тулбара — Reka-скин, в отличие от headless, тянет
 * иконку-либу (уже peer dependency пакета), логика кнопок (`RICH_TEXT_ACTIONS`) общая с headless
 * из `@letar/forms-vue/core`, здесь только визуальное представление. */
export const RICH_TEXT_ICONS: Record<RichTextButton, Component> = {
  bold: Bold,
  italic: Italic,
  underline: UnderlineIcon,
  strike: Strikethrough,
  code: Code,
  heading1: Heading1,
  heading2: Heading2,
  heading3: Heading3,
  bulletList: List,
  orderedList: ListOrdered,
  blockquote: Quote,
  link: LinkIcon,
  undo: Undo,
  redo: Redo,
}

export { ICON_SIZE, RICH_TEXT_BUTTON_LABELS }
