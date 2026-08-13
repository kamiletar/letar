/** Тип допустимых символов ячейки PIN/OTP — используется `FieldPinInputComponent` и
 * `FieldOtpInputComponent`. 1-в-1 с Vue (`@letar/forms-vue`, `use-pin-input-field.ts`). */
export type PinInputCharType = 'numeric' | 'alphanumeric' | 'alphabetic'

export const PIN_INPUT_PATTERNS: Record<PinInputCharType, RegExp> = {
  numeric: /[0-9]/,
  alphanumeric: /[a-zA-Z0-9]/,
  alphabetic: /[a-zA-Z]/,
}

/**
 * Раскладывает строковое значение поля по ячейкам, дополняя пустыми строками до `count`.
 * Общая утилита `FieldPinInputComponent`/`FieldOtpInputComponent` — Angular-версия чистой функции
 * `splitPinChars` (`@letar/forms-vue/core`, `use-pin-input-field.ts`), framework-agnostic по
 * своей природе, но не вынесена в `forms-core` — единственные потребители этой пары полей.
 */
export function splitPinChars(value: string, count: number): string[] {
  const arr = value.split('').slice(0, count)
  while (arr.length < count) {
    arr.push('')
  }
  return arr
}
