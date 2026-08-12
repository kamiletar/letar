import { classifyValue } from './classify-value'
import { computeMaskParts, unformat } from './parts'
import type { ApplyChangeInput, ApplyChangeResult, MaskPart } from './types'

/** Извлекает raw-поток (только `input`-символы) из уже подтверждённых частей `value`. */
function extractRaw(parts: MaskPart[]): string {
  return parts.filter((part) => part.type === 'input').map((part) => part.char).join('')
}

/** Число input-символов среди первых `valuePos` символов `value` (= позиция в raw-потоке). */
function rawIndexAt(parts: MaskPart[], valuePos: number): number {
  let count = 0
  for (let i = 0; i < valuePos && i < parts.length; i++) {
    if (parts[i].type === 'input') {
      count++
    }
  }
  return count
}

/**
 * Ближайшая позиция input-символа СЛЕВА от `valuePos` (индекс символа в `value`,
 * не raw-индекс) — backspace без выделения должен удалить его, перескочив литералы.
 * `null`, если слева нет ни одного input-символа.
 */
function nearestInputLeft(parts: MaskPart[], valuePos: number): number | null {
  for (let i = valuePos - 1; i >= 0; i--) {
    if (parts[i]?.type === 'input') {
      return i
    }
  }
  return null
}

/** Симметрично `nearestInputLeft` — для Delete (deleteForward) без выделения. */
function nearestInputRight(parts: MaskPart[], valuePos: number): number | null {
  for (let i = valuePos; i < parts.length; i++) {
    if (parts[i]?.type === 'input') {
      return i
    }
  }
  return null
}

/** Позиция в новом `value` сразу после N-го (по счёту) input-символа. */
function valuePositionAfterRawIndex(parts: MaskPart[], rawIndex: number): number {
  if (rawIndex <= 0) {
    return 0
  }
  let count = 0
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].type === 'input') {
      count++
      if (count === rawIndex) {
        return i + 1
      }
    }
  }
  return parts.length
}

/**
 * Центральная функция движка: применяет одно редактирование (вставка/удаление) к
 * уже отформатированному значению и возвращает новое значение + позицию каретки.
 *
 * Каретка считается по числу значащих (`input`) символов слева от неё, а не по
 * дельте длины строки — дельта не различает вставку/удаление в середине значения
 * от изменений в конце. Три раздельные ветки (`insert`/`deleteBackward`/
 * `deleteForward`) отражают разную семантику «куда садится каретка» — см.
 * MASK_ENGINE.md §6.4.
 *
 * ⚠️ `addedValue` не пред-фильтруется: литеральные символы вставки (пробелы, скобки)
 * движок сам отбросит при раскладке по слотам. Но если `addedValue` содержит цифры,
 * дублирующие ЛИТЕРАЛЫ маски (например код страны «7» в скопированном целиком номере
 * «+7 (900)…» при вставке в маску «+7 (999)…») — эти цифры не отличимы от «настоящих»
 * данных и попадут в первый input-слот, сдвинув остальное на одну позицию. Это тот же
 * класс проблемы, что и найденный баг с префиксом «8» (MASK_ENGINE.md §4, §7.2) — там
 * он решён точечным препроцессором в `formatPhoneNumber`, здесь для универсального
 * движка препроцессор вставки/автозаполнения — открытая часть Этапа 4, не Этапа 1.
 */
export function applyChange(input: ApplyChangeInput): ApplyChangeResult {
  const { previousValue, inputType, addedValue, mask, options } = input
  let { changeStart, changeEnd } = input

  const prevParts = classifyValue(previousValue, mask, options)

  // Backspace/Delete без выделения — раздвигаем диапазон удаления до ближайшего
  // input-символа в соответствующем направлении, перескакивая литералы.
  if (changeStart === changeEnd && addedValue === '') {
    if (inputType === 'deleteBackward') {
      const target = nearestInputLeft(prevParts, changeStart)
      changeStart = target === null ? changeEnd : target
    } else if (inputType === 'deleteForward') {
      const target = nearestInputRight(prevParts, changeStart)
      changeEnd = target === null ? changeStart : target + 1
    }
  }

  const prevRaw = extractRaw(prevParts)
  const leftRawCount = rawIndexAt(prevParts, changeStart)
  const removedRawCount = rawIndexAt(prevParts, changeEnd) - leftRawCount

  const rawBefore = prevRaw.slice(0, leftRawCount)
  const rawAfter = prevRaw.slice(leftRawCount + removedRawCount)
  const newRaw = rawBefore + addedValue + rawAfter

  const { parts: newParts } = computeMaskParts(newRaw, mask, options)
  const value = newParts.map((part) => part.char).join('')

  // Сколько символов из addedValue реально прошли хотя бы один паттерн токена маски
  // (устойчиво к тому, что часть вставленного текста — литералы вида скобок/дефисов,
  // которые движок сам отбрасывает при раскладке по слотам).
  const insertedRawCount = unformat(addedValue, mask, options).length
  const targetRawIndex = inputType === 'insert' ? leftRawCount + insertedRawCount : leftRawCount
  const caret = valuePositionAfterRawIndex(newParts, targetRawIndex)

  return { value, selectionStart: caret, selectionEnd: caret }
}
