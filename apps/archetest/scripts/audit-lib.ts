/**
 * Чистые функции аудита банка вопросов (этап 5.10, часть A).
 *
 * Вынесены из audit-question-bank.ts, чтобы их можно было тестировать:
 * сам скрипт исполняет аудит на верхнем уровне, и его импорт из теста
 * запускал бы полный проход по банку с перезаписью отчётов.
 * Тесты: src/app/[locale]/_data/question-bank-audit.test.ts.
 */

/** Нормализация текста для сравнения: регистр, ё, пунктуация, пробелы */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replaceAll('ё', 'е')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Множество символьных триграмм нормализованной строки */
export function trigrams(s: string): Set<string> {
  const grams = new Set<string>()
  for (let i = 0; i + 3 <= s.length; i++) {
    grams.add(s.slice(i, i + 3))
  }
  return grams
}

/** Коэффициент Жаккара двух множеств */
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) {
    return 0
  }
  const [small, big] = a.size <= b.size ? [a, b] : [b, a]
  let hits = 0
  for (const g of small) {
    if (big.has(g)) {
      hits++
    }
  }
  return hits / (a.size + b.size - hits)
}

/** Свернуть отсортированные номера в диапазоны: [1,2,3,7] → «№1–3, №7» */
export function collapseRanges(nums: number[]): string {
  if (nums.length === 0) {
    return ''
  }
  const sorted = [...nums].sort((a, b) => a - b)
  const parts: string[] = []
  let start = sorted[0]
  let prev = sorted[0]
  for (const n of sorted.slice(1)) {
    if (n === prev + 1) {
      prev = n
      continue
    }
    parts.push(start === prev ? `№${start}` : `№${start}–${prev}`)
    start = n
    prev = n
  }
  parts.push(start === prev ? `№${start}` : `№${start}–${prev}`)
  return parts.join(', ')
}

/**
 * Служебные слова, не несущие сюжета. Список не претендует на полноту —
 * его задача убрать самые частые местоимения/предлоги/связки, чтобы IDF
 * остальных слов был осмысленным.
 */
const STOP_WORDS = new Set([
  'вы',
  'вам',
  'вас',
  'ваш',
  'ваша',
  'ваше',
  'ваши',
  'вашей',
  'вашего',
  'вами',
  'что',
  'как',
  'это',
  'этого',
  'этом',
  'эту',
  'этот',
  'при',
  'для',
  'без',
  'его',
  'ему',
  'нее',
  'ней',
  'него',
  'них',
  'ним',
  'нем',
  'она',
  'они',
  'оно',
  'или',
  'но',
  'не',
  'ни',
  'на',
  'во',
  'со',
  'ко',
  'об',
  'от',
  'до',
  'по',
  'за',
  'из',
  'через',
  'если',
  'то',
  'же',
  'бы',
  'ли',
  'уже',
  'еще',
  'только',
  'очень',
  'после',
  'перед',
  'хотя',
  'чтобы',
  'когда',
  'который',
  'которая',
  'которое',
  'которые',
  'себя',
  'себе',
  'свой',
  'своя',
  'свое',
  'свои',
  'своей',
  'своего',
  'один',
  'одна',
  'одно',
  'вдруг',
  'просто',
  'снова',
  'опять',
  'между',
])

/**
 * Стемы содержательных слов: слова ≥ 3 символов вне стоп-листа, усечённые
 * до 4 символов. Усечение — грубая замена морфологии («кошелёк/кошельке» → «коше»,
 * «сдачи/сдачу» → «сдач»); коллизии вроде «день/деньги» приемлемы, их сглаживает IDF.
 */
export function contentStems(norm: string): Set<string> {
  const stems = new Set<string>()
  for (const word of norm.split(' ')) {
    if (word.length < 3 || STOP_WORDS.has(word)) {
      continue
    }
    stems.add(word.slice(0, 4))
  }
  return stems
}
