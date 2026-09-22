import { resolveTranslation } from './resolve-translation'
import type { TranslateFunction, TranslateParams } from './types'

/** Локаль, которая используется, когда `FormI18nProvider` в дереве нет вовсе */
export const DEFAULT_STATIC_TEXT_LOCALE = 'en'

/**
 * Форма значения, которое отдаёт `useFormI18n()` (`@letar/forms-react`) — описана структурно,
 * без импорта самого хука: forms-core dependency-free и не тянет React.
 */
export interface StaticTextI18nContext {
  t: TranslateFunction
  locale: string
  enabled: boolean
}

/**
 * Единый резолвер статичного UI-текста форм — общая лестница резолва для заголовка
 * `Form.Errors`, подсказки `minChars` в Combobox/Autocomplete и текстов диалога
 * `form-persistence`, которые независимо повторяли один и тот же порядок в трёх местах.
 *
 * Порядок: перевод приложения по `key` (если `FormI18nProvider` получил свой `t`) → встроенный
 * дефолт по фактической `locale` → встроенный дефолт по `DEFAULT_STATIC_TEXT_LOCALE`, если
 * провайдера в дереве нет вовсе (документированный контракт — см.
 * `.claude/docs/letar-forms-missing-i18nprovider-english-hints.md`).
 *
 * `resolveBuiltin` сам решает, что значит «встроенный дефолт по locale»: словарь ru/en с
 * плюрализацией числового параметра (как у `minCharsHint`) или просто фиксированный текст из
 * пропов приложения (как у `form-persistence`, где своего встроенного словаря вовсе нет —
 * `resolveBuiltin` там игнорирует переданную locale и всегда возвращает один и тот же fallback).
 */
export function resolveStaticFormText(
  i18n: StaticTextI18nContext | null,
  key: string,
  resolveBuiltin: (locale: string) => string,
  params?: TranslateParams,
): string {
  if (!i18n) {
    return resolveBuiltin(DEFAULT_STATIC_TEXT_LOCALE)
  }

  const translated = resolveTranslation(i18n.t, key, params)
  if (translated) {
    return translated
  }

  return resolveBuiltin(i18n.locale)
}
