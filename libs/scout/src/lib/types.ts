/** Вид карточки индекса: откуда она собрана */
export type CardKind = 'doc' | 'section' | 'rule' | 'skill' | 'command' | 'agent' | 'field' | 'pattern'

/** Карточка — единица поиска. Справка строится только из карточек, поэтому ссылки в ней всегда реальные */
export interface Card {
  /** Стабильный идентификатор: `doc:<path>`, `sec:<path>:<line>`, `skill:<name>` … */
  id: string
  kind: CardKind
  /** Путь от корня репозитория, прямые слэши, без ведущего `/` */
  path: string
  /** Строка, на которую указывает ссылка (1 — начало файла) */
  line: number
  /** Имя: для дока — slug, для секции — заголовок, для скила — `name` */
  title: string
  /** Короткое описание для справки: аннотация INDEX.md, `description` скила, начало секции */
  summary: string
  /** ⭐ — читать до начала работы в теме */
  star?: boolean
  /** ⚠️ — ловушка, которая выглядит как успех */
  warn?: boolean
  /** Раздел INDEX.md, в котором стоит док */
  topic?: string
  /** `app` — команда приложения (`/<app>`): её не советуем, у приложений своя статическая справка */
  scope?: 'app'
  /** Взвешенный текст для индексации: поле → вес */
  fields: WeightedField[]
}

export interface WeightedField {
  text: string
  weight: number
}

/** Карточка в индексе: частоты термов уже посчитаны */
export interface IndexedCard extends Omit<Card, 'fields'> {
  tf: Record<string, number>
  len: number
}

/** Сериализуемый индекс, лежит в `SCOUT_HOME/index.json` */
/**
 * Версия формата индекса. Поднимать при любом изменении набора или вида карточек: сохранённый
 * индекс пересобирается по свежести исходников, а сами исходники при этом могли не меняться
 * (так карточки полей форм не попали в индекс, собранный до их появления).
 */
export const INDEX_VERSION = 2

export interface ScoutIndex {
  version: typeof INDEX_VERSION
  builtAt: string
  cards: IndexedCard[]
}
