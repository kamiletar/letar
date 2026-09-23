/**
 * Общий матчер HTML-атрибута `accept`, используемый и `Dropzone` (drag&drop + input),
 * и `useFileDragDrop` (drag&drop без Dropzone, например `useImageUpload`).
 *
 * Вынесен из `dropzone.tsx`: `useFileDragDrop` держал свой более узкий матчер (один
 * MIME-тип или один wildcard, без списка через запятую и без расширений) — при
 * `acceptTypes` со списком (`'image/png,image/jpeg'`) он молча сравнивал весь список
 * целиком с `file.type` и отклонял всё подряд.
 */

/**
 * Проверяет файл на соответствие одному шаблону из `accept`: точный MIME-тип
 * (`image/png`), MIME-категория со звёздочкой (`image/*`), расширение
 * (`.pdf`) либо один из шаблонов «принять всё» (одна звёздочка или её MIME-форма).
 */
export function matchesAcceptPattern(file: File, pattern: string): boolean {
  if (pattern === '*' || pattern === '*/*') {
    return true
  }
  if (pattern.startsWith('.')) {
    return file.name.toLowerCase().endsWith(pattern.toLowerCase())
  }
  if (pattern.endsWith('/*')) {
    return file.type.startsWith(pattern.slice(0, -1))
  }
  return file.type === pattern
}

/**
 * Проверяет файл на соответствие `accept` — списку шаблонов через запятую,
 * как в одноимённом HTML-атрибуте. Пустой/отсутствующий `accept` пропускает всё.
 */
export function isFileAccepted(file: File, accept: string): boolean {
  const patterns = accept
    .split(',')
    .map((pattern) => pattern.trim())
    .filter(Boolean)

  if (patterns.length === 0) {
    return true
  }

  return patterns.some((pattern) => matchesAcceptPattern(file, pattern))
}
