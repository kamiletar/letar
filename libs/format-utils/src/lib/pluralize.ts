/**
 * Русское склонение числительных (1 спальня / 2 спальни / 5 спален)
 *
 * @example
 * pluralizeRu(1, 'спальня', 'спальни', 'спален') // 'спальня'
 * pluralizeRu(3, 'спальня', 'спальни', 'спален') // 'спальни'
 * pluralizeRu(11, 'спальня', 'спальни', 'спален') // 'спален'
 */
export function pluralizeRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
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
