'use client'

import { DEFAULT_STATIC_TEXT_LOCALE, resolveStaticFormText } from '@letar/forms-core/i18n'
import { useFormI18n } from '../i18n'

/**
 * Ключи переводов содержимого `LinkPopover` (`libs/forms`, Chakra-скин `Form.Field.RichText`) —
 * placeholder инпута и кнопки Remove/Cancel/Apply внутри самого попапа. Отдельно от
 * `formToolbar.linkAdd`/`formToolbar.linkRemove` (`toolbar-strings.ts`) — те строки — это
 * `aria-label` кнопки-триггера, эти — тело попапа, семантически другая категория (тулбар описывает
 * только подписи кнопок тулбара, не контент диалогов).
 *
 * Только Chakra-скин: shadcn-версия `TOOLBAR_CONFIG.link` (`rich-text-toolbar-config.tsx`) рисует
 * не Popover, а `window.prompt` (beta-упрощение) — общего рантайма для этих строк со shadcn пока
 * нет, но словарь всё равно лежит в `forms-react` (не в `libs/forms`, в отличие от `formField.*`),
 * по образцу `formFieldPlaceholder.*`/`formPasswordStrength.*`/`formSelection.*` — сюда сходятся
 * почти все словари статичных строк форм независимо от того, разделяют ли скины рантайм.
 */
export type LinkPopoverStringKey =
  | 'formLinkPopover.placeholder'
  | 'formLinkPopover.remove'
  | 'formLinkPopover.cancel'
  | 'formLinkPopover.apply'

const BUILTIN_LINK_POPOVER_STRINGS: Record<LinkPopoverStringKey, Record<string, string>> = {
  'formLinkPopover.placeholder': { en: 'https://example.com', ru: 'https://example.com' },
  'formLinkPopover.remove': { en: 'Remove', ru: 'Убрать' },
  'formLinkPopover.cancel': { en: 'Cancel', ru: 'Отмена' },
  'formLinkPopover.apply': { en: 'Apply', ru: 'Применить' },
}

function buildBuiltinString(key: LinkPopoverStringKey, locale: string): string {
  const lang = locale.split('-')[0] ?? locale
  const dict = BUILTIN_LINK_POPOVER_STRINGS[key]

  return dict[lang] ?? dict[DEFAULT_STATIC_TEXT_LOCALE]!
}

/**
 * Резолвит строку `LinkPopover` — та же лестница `resolveStaticFormText`, что у
 * `resolveToolbarString`/`resolveFieldPlaceholderString`: перевод приложения по ключу →
 * встроенный словарь по `locale` (ru/en) → английский текст, если провайдера в дереве нет вовсе и
 * скин не передал свой `noProviderLocale`.
 */
export function resolveLinkPopoverString(
  i18n: ReturnType<typeof useFormI18n>,
  key: LinkPopoverStringKey,
  noProviderLocale?: string,
): string {
  const builtin = (locale: string) => buildBuiltinString(key, locale)
  return !i18n && noProviderLocale ? builtin(noProviderLocale) : resolveStaticFormText(i18n, key, builtin)
}

/**
 * Хук-обёртка над `resolveLinkPopoverString` для одиночного ключа.
 */
export function useLinkPopoverString(key: LinkPopoverStringKey, noProviderLocale?: string): string {
  return resolveLinkPopoverString(useFormI18n(), key, noProviderLocale)
}
