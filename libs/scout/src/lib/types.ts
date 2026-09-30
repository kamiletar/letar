/** Вид карточки индекса: откуда она собрана */
export type CardKind = 'doc' | 'section' | 'rule' | 'skill' | 'agent' | 'field' | 'pattern'

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
  /**
   * `app` — скил приложения (`/<app>`): его не советуем, у приложений своя статическая справка.
   * `service` — служебный скил роли или сессии, агенту по задаче его не советуем.
   * `user-only` — `disable-model-invocation: true`: модель такой скил вызвать не может, советовать нечего.
   */
  scope?: 'app' | 'service' | 'user-only'
  /** Правило без `paths:` во frontmatter: харнесс грузит его в каждую сессию, советовать незачем */
  loaded?: boolean
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
  /** Хеш текста для эмбеддинга (`embedHash`): по нему сверяют векторы с индексом */
  embedHash: string
}

/** Сериализуемый индекс, лежит в `SCOUT_HOME/index.json` */
/**
 * Версия формата индекса. Поднимать при любом изменении набора или вида карточек: сохранённый
 * индекс пересобирается по свежести исходников, а сами исходники при этом могли не меняться
 * (так карточки полей форм не попали в индекс, собранный до их появления).
 * 3 — частоты без прототипа, команды из подкаталогов, `embedHash`.
 * 4 — `loaded` у правил без `paths:`.
 * 5 — после миграции инструкций: источник команд (`.claude/commands`) удалён, скилы только из
 *     `.agents/skills`, `scope` у скилов приложений, служебных и `disable-model-invocation`.
 */
export const INDEX_VERSION = 6

export interface ScoutIndex {
  version: typeof INDEX_VERSION
  builtAt: string
  cards: IndexedCard[]
}
