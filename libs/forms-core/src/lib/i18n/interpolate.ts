export type InterpolateParams = Record<string, string | number>

/**
 * Подставляет `{key}` в статичном шаблоне на значение из `params` — поздняя интерполяция builtin-
 * словарей `forms-react` (`image-popover-strings.ts`, `selection-strings.ts`, `min-chars-hint.ts`):
 * сам шаблон резолвится через `resolveStaticFormText` заранее (при вызове хука поля), а значение
 * параметра (`label` неудачного settle, `parent` заблокированного поля, размер файла) появляется
 * только в момент рендера/события — поэтому его нельзя передать в `params` у
 * `resolveStaticFormText`, тот отдаёт параметры только `t()` приложения.
 *
 * Не заменяет `TranslateParams` у `resolveStaticFormText`/`resolveTranslation` — те интерполирует
 * сам `t()` приложения (next-intl и совместимые). Эта функция — только для builtin-текста, который
 * `forms-react` подставляет своими руками.
 *
 * Оставшийся в результате `{...}` (например переименовали плейсхолдер в словаре и забыли обновить
 * вызов) не бросает исключение — статичный UI-текст не должен ронять рендер поля из-за опечатки в
 * переводе, но `console.warn` делает это видимым сразу, а не сообщением от пользователя.
 */
export function interpolate(template: string, params: InterpolateParams): string {
  const result = Object.entries(params).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template,
  )

  if (result.includes('{') && /\{\w+\}/.test(result)) {
    console.warn(`interpolate: незаменённый плейсхолдер в шаблоне "${template}", params: ${JSON.stringify(params)}`)
  }

  return result
}
