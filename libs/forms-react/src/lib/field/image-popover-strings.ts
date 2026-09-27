'use client'

import { DEFAULT_STATIC_TEXT_LOCALE, resolveStaticFormText } from '@letar/forms-core/i18n'
import { useFormI18n } from '../i18n'

/**
 * Ключи переводов содержимого `ImagePopover` (`libs/forms`, Chakra-скин `Form.Field.RichText`) —
 * дропзона, кнопки Cancel/Try again, сообщения об ошибках загрузки. Отдельно от
 * `formToolbar.image` (`toolbar-strings.ts`, `aria-label` кнопки-триггера) — та же граница, что у
 * `LinkPopover`/`link-popover-strings.ts`: тулбар описывает только подписи своих кнопок, не
 * контент диалогов.
 *
 * Только Chakra-скин — shadcn вообще не рисует эту кнопку (beta-упрощение, см. комментарий в
 * `rich-text-toolbar-config.tsx`: вставка изображений с загрузкой на сервер не портирована).
 *
 * `errorSizeExceeded` — с `{size}`, подставляется вызывающей стороной через `.replace('{size}',
 * ...)` (тот же приём интерполяции, что у `formSelection.settleError`/`formSelection.dependsOnHint`
 * в `selection-strings.ts`), а не отдельным аргументом резолвера.
 */
export type ImagePopoverStringKey =
  | 'formImagePopover.dropHint'
  | 'formImagePopover.dropHintSub'
  | 'formImagePopover.sizeHint'
  | 'formImagePopover.cancel'
  | 'formImagePopover.loading'
  | 'formImagePopover.tryAgain'
  | 'formImagePopover.errorNotImage'
  | 'formImagePopover.errorSizeExceeded'
  | 'formImagePopover.errorGeneric'
  | 'formImagePopover.errorUrlMissing'

const BUILTIN_IMAGE_POPOVER_STRINGS: Record<ImagePopoverStringKey, Record<string, string>> = {
  'formImagePopover.dropHint': { en: 'Drag image here', ru: 'Перетащите изображение сюда' },
  'formImagePopover.dropHintSub': { en: 'or click to select', ru: 'или нажмите, чтобы выбрать' },
  'formImagePopover.sizeHint': { en: 'PNG, JPG, WEBP up to {size}MB', ru: 'PNG, JPG, WEBP до {size}МБ' },
  'formImagePopover.cancel': { en: 'Cancel', ru: 'Отмена' },
  'formImagePopover.loading': { en: 'Loading...', ru: 'Загрузка...' },
  'formImagePopover.tryAgain': { en: 'Try again', ru: 'Попробовать снова' },
  'formImagePopover.errorNotImage': { en: 'File must be an image', ru: 'Файл должен быть изображением' },
  'formImagePopover.errorSizeExceeded': {
    en: 'File size must not exceed {size}MB',
    ru: 'Размер файла не должен превышать {size}МБ',
  },
  'formImagePopover.errorGeneric': { en: 'Upload error', ru: 'Ошибка загрузки' },
  'formImagePopover.errorUrlMissing': { en: 'Image URL not received', ru: 'Не получен URL изображения' },
}

function buildBuiltinString(key: ImagePopoverStringKey, locale: string): string {
  const lang = locale.split('-')[0] ?? locale
  const dict = BUILTIN_IMAGE_POPOVER_STRINGS[key]

  return dict[lang] ?? dict[DEFAULT_STATIC_TEXT_LOCALE]!
}

/**
 * Резолвит строку `ImagePopover` — та же лестница `resolveStaticFormText`, что у
 * `resolveLinkPopoverString`/`resolveToolbarString`: перевод приложения по ключу → встроенный
 * словарь по `locale` (ru/en) → английский текст, если провайдера в дереве нет вовсе и скин не
 * передал свой `noProviderLocale`.
 */
export function resolveImagePopoverString(
  i18n: ReturnType<typeof useFormI18n>,
  key: ImagePopoverStringKey,
  noProviderLocale?: string,
): string {
  const builtin = (locale: string) => buildBuiltinString(key, locale)
  return !i18n && noProviderLocale ? builtin(noProviderLocale) : resolveStaticFormText(i18n, key, builtin)
}

/**
 * Хук-обёртка над `resolveImagePopoverString` для одиночного ключа.
 */
export function useImagePopoverString(key: ImagePopoverStringKey, noProviderLocale?: string): string {
  return resolveImagePopoverString(useFormI18n(), key, noProviderLocale)
}
