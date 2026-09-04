/**
 * Утилиты для работы со списком «чувствительных» путей формы (dot-notation, как у
 * `form.setFieldValue`/`getByPath` — `"apiKey.value"`, `"settings.card.cvv"`).
 *
 * Framework-free ядро общего redaction-слоя: поле-компонент (`Form.Field.EditIntent` и в
 * будущем любое другое, помеченное `sensitive`) регистрирует свой путь через реестр
 * `@letar/forms-react` (`useRegisterSensitiveField`), а потребители снапшота формы
 * (persistence/DebugValues/URL sync/аналитика) используют эти чистые функции, чтобы либо
 * полностью вырезать чувствительное значение (`omitAtPaths`), либо заменить его плейсхолдером
 * для визуальной инспекции (`redactAtPaths`).
 */

/** Плейсхолдер по умолчанию для {@link redactAtPaths}. */
export const DEFAULT_REDACTION_PLACEHOLDER = '••••••••'

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Точечно резолвит `a.b.c` в объекте — тот же дот-путь, которым `form.setFieldValue` уже
 * адресует вложенные значения формы.
 */
export function getAtPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (!isPlainRecord(acc)) {
      return undefined
    }
    return acc[key]
  }, source)
}

/**
 * Возвращает копию `value` с указанным путём заменённым на `replacement` — структурно
 * шарит всё, кроме узлов на самом пути (persistent-update, не полный deep clone). Массивы по
 * пути не поддерживаются намеренно — пути полей формы адресуют объекты, не элементы массива;
 * встретив массив на пути, функция останавливается и возвращает исходное значение без изменений.
 */
function setAtPath<T>(value: T, parts: string[], replacement: unknown): T {
  if (parts.length === 0) {
    return replacement as T
  }
  if (!isPlainRecord(value)) {
    // Пути нет в этой ветке — нечего заменять
    return value
  }
  const [head, ...rest] = parts
  if (!(head in value)) {
    return value
  }
  return { ...value, [head]: setAtPath(value[head], rest, replacement) } as T
}

/** Возвращает копию `value` без указанного пути (ключ удалён на глубине пути). */
function deleteAtPath<T>(value: T, parts: string[]): T {
  if (!isPlainRecord(value) || parts.length === 0) {
    return value
  }
  const [head, ...rest] = parts
  if (!(head in value)) {
    return value
  }
  if (rest.length === 0) {
    const { [head]: _omitted, ...remaining } = value
    return remaining as T
  }
  return { ...value, [head]: deleteAtPath(value[head], rest) } as T
}

/**
 * Заменяет значения по указанным dot-путям на плейсхолдер — для визуальной инспекции
 * (например `Form.DebugValues`), где ключ должен остаться на месте, но не должен раскрывать
 * реальное содержимое.
 */
export function redactAtPaths<T>(
  value: T,
  paths: readonly string[],
  placeholder: unknown = DEFAULT_REDACTION_PLACEHOLDER,
): T {
  return paths.reduce<T>((acc, path) => setAtPath(acc, path.split('.'), placeholder), value)
}

/**
 * Полностью вырезает значения по указанным dot-путям (ключ удаляется) — для снимков, которые
 * не должны нести чувствительные данные вообще (persistence/offline queue), в отличие от
 * {@link redactAtPaths}, которая только маскирует значение на месте.
 */
export function omitAtPaths<T>(value: T, paths: readonly string[]): T {
  return paths.reduce<T>((acc, path) => deleteAtPath(acc, path.split('.')), value)
}

/**
 * `true`, если топ-уровневый ключ `key` сам является чувствительным путём или префиксом
 * (родителем) любого зарегистрированного чувствительного пути — например `key = "apiKey"`
 * покрывает зарегистрированный путь `"apiKey.value"`. Нужна там, где потребитель адресует
 * данные по топ-уровневым ключам целиком (whitelist полей `Form.UrlSync`), а не по
 * произвольной вложенности.
 */
export function isKeyOrAncestorOfSensitivePath(key: string, sensitivePaths: readonly string[]): boolean {
  return sensitivePaths.some((path) => path === key || path.startsWith(`${key}.`))
}
