/**
 * Русское склонение числительных (1 спальня / 2 спальни / 5 спален)
 *
 * Дробное число (2.5, 0.75) в русском языке всегда согласуется формой родительного падежа
 * единственного числа — той же, что и у 2–4 («2.5 спальни», не «2.5 спален» и не «2.5 спальня») —
 * поэтому для нецелых `n` функция всегда возвращает `few`, минуя обычное правило по остатку.
 *
 * @example
 * pluralizeRu(1, 'спальня', 'спальни', 'спален') // 'спальня'
 * pluralizeRu(3, 'спальня', 'спальни', 'спален') // 'спальни'
 * pluralizeRu(11, 'спальня', 'спальни', 'спален') // 'спален'
 * pluralizeRu(2.5, 'метр', 'метра', 'метров') // 'метра'
 */
export function pluralizeRu(n: number, one: string, few: string, many: string): string {
  const absN = Math.abs(n)
  if (!Number.isInteger(absN)) {
    return few
  }
  const mod10 = absN % 10
  const mod100 = absN % 100
  if (mod100 >= 11 && mod100 <= 19) {
    return many
  }
  if (mod10 === 1) {
    return one
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return few
  }
  return many
}
