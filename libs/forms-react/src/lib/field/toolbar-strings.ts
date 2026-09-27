'use client'

import { DEFAULT_STATIC_TEXT_LOCALE, resolveStaticFormText } from '@letar/forms-core/i18n'
import { useFormI18n } from '../i18n'

/**
 * Ключи переводов подписей кнопок тулбара `Form.Field.RichText` — единственный словарь строк форм,
 * общий сразу для Chakra- (`toolbar-config.tsx` в `libs/forms`) и shadcn-скина
 * (`rich-text-toolbar-config.tsx` в `libs/forms-shadcn`): в отличие от `formFieldPlaceholder.*`/
 * `formSignature.*` (у каждого скина свой словарь), у тулбара один набор ключей на оба —
 * `TOOLBAR_CONFIG` каждого скина хранит `labelKey` вместо готового текста, а подпись резолвится в
 * месте рендера кнопки через `resolveToolbarString`/`useToolbarString`.
 *
 * До заведения словаря русский текст был вперемешку с английским в Chakra-конфиге (исторический
 * артефакт разных сессий) и полностью на русском — в shadcn. Источником истины взят shadcn
 * (внутренне последовательный), Chakra-конфиг при подключении словаря выровнен под него.
 *
 * `formToolbar.image` используется только Chakra-версией — вставка изображений с загрузкой на
 * сервер не портирована в shadcn (beta-упрощение, см. комментарий в `rich-text-toolbar-config.tsx`).
 *
 * `formToolbar.linkAdd`/`formToolbar.linkRemove` используются только Chakra-версией: `LinkPopover`
 * рендерится вместо обычной кнопки из `TOOLBAR_CONFIG` и переключает подпись по `isActive` —
 * shadcn-скин ссылку через `TOOLBAR_CONFIG.link.labelKey` (`formToolbar.link`), без разделения на
 * состояния добавления/снятия.
 */
export type ToolbarStringKey =
  | 'formToolbar.bold'
  | 'formToolbar.italic'
  | 'formToolbar.underline'
  | 'formToolbar.strike'
  | 'formToolbar.code'
  | 'formToolbar.heading1'
  | 'formToolbar.heading2'
  | 'formToolbar.heading3'
  | 'formToolbar.bulletList'
  | 'formToolbar.orderedList'
  | 'formToolbar.blockquote'
  | 'formToolbar.link'
  | 'formToolbar.linkAdd'
  | 'formToolbar.linkRemove'
  | 'formToolbar.undo'
  | 'formToolbar.redo'
  | 'formToolbar.image'

const BUILTIN_TOOLBAR_STRINGS: Record<ToolbarStringKey, Record<string, string>> = {
  'formToolbar.bold': { en: 'Bold', ru: 'Полужирный' },
  'formToolbar.italic': { en: 'Italic', ru: 'Курсив' },
  'formToolbar.underline': { en: 'Underline', ru: 'Подчёркнутый' },
  'formToolbar.strike': { en: 'Strikethrough', ru: 'Зачёркнутый' },
  'formToolbar.code': { en: 'Code', ru: 'Код' },
  'formToolbar.heading1': { en: 'Heading 1', ru: 'Заголовок 1' },
  'formToolbar.heading2': { en: 'Heading 2', ru: 'Заголовок 2' },
  'formToolbar.heading3': { en: 'Heading 3', ru: 'Заголовок 3' },
  'formToolbar.bulletList': { en: 'Bullet list', ru: 'Маркированный список' },
  'formToolbar.orderedList': { en: 'Ordered list', ru: 'Нумерованный список' },
  'formToolbar.blockquote': { en: 'Quote', ru: 'Цитата' },
  'formToolbar.link': { en: 'Link', ru: 'Ссылка' },
  'formToolbar.linkAdd': { en: 'Add link', ru: 'Добавить ссылку' },
  'formToolbar.linkRemove': { en: 'Remove link', ru: 'Убрать ссылку' },
  'formToolbar.undo': { en: 'Undo', ru: 'Отменить' },
  'formToolbar.redo': { en: 'Redo', ru: 'Повторить' },
  'formToolbar.image': { en: 'Insert image', ru: 'Вставить изображение' },
}

function buildBuiltinString(key: ToolbarStringKey, locale: string): string {
  const lang = locale.split('-')[0] ?? locale
  const dict = BUILTIN_TOOLBAR_STRINGS[key]

  return dict[lang] ?? dict[DEFAULT_STATIC_TEXT_LOCALE]!
}

/**
 * Резолвит подпись кнопки тулбара — та же лестница `resolveStaticFormText`, что у
 * `resolveFieldPlaceholderString`/`resolveSignatureString`: перевод приложения по ключу →
 * встроенный словарь по `locale` (ru/en) → английский текст, если провайдера в дереве нет вовсе и
 * скин не передал свой `noProviderLocale`.
 *
 * Чистая функция, не хук — вызывается из `.map()` по кнопкам тулбара внутри рендера поля, где
 * `i18n` уже получен один раз через `useFormI18n()`/`useToolbarString`.
 */
export function resolveToolbarString(
  i18n: ReturnType<typeof useFormI18n>,
  key: ToolbarStringKey,
  noProviderLocale?: string,
): string {
  const builtin = (locale: string) => buildBuiltinString(key, locale)
  return !i18n && noProviderLocale ? builtin(noProviderLocale) : resolveStaticFormText(i18n, key, builtin)
}

/**
 * Хук-обёртка над `resolveToolbarString` для одиночного ключа.
 *
 * ⚠️ Тулбар рендерит переменное число кнопок (`toolbarButtons` — проп), поэтому вызывать этот хук
 * в цикле по кнопкам нельзя (нарушение Rules of Hooks). Компонент тулбара берёт `useFormI18n()`
 * один раз и резолвит подписи всех кнопок через `resolveToolbarString` — обычную функцию.
 */
export function useToolbarString(key: ToolbarStringKey, noProviderLocale?: string): string {
  return resolveToolbarString(useFormI18n(), key, noProviderLocale)
}
