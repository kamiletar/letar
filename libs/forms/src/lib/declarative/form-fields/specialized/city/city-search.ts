/**
 * Поиск по справочнику городов России (режим словаря `Form.Field.City`).
 *
 * Справочник (`cities-ru.ts`, ~1100 городов) грузится ленивой подгрузкой при первом обращении и не попадает в бандл формы.
 * Порядок строк — по убыванию населения, поэтому индекс строки служит рангом выдачи.
 */

/** Город справочника */
export interface CityEntry {
  /** Название: «Тверь», «Советск» */
  name: string
  /** Субъект РФ: «Тверская область». У Москвы и Санкт-Петербурга совпадает с названием */
  region: string
  /**
   * Значение поля формы. Для уникального названия — само название («Тверь», совместимо со старыми данными),
   * для повторяющегося — с регионом («Советск, Калининградская область»).
   */
  value: string
}

/** Результат `matchCity` */
export interface CityMatch extends CityEntry {
  /** Название встречается в нескольких регионах, а текст не указал, в каком: выбран самый крупный */
  ambiguous: boolean
}

let citiesPromise: Promise<readonly CityEntry[]> | undefined

/** Приведение к виду для сравнения: регистр, ё/е, дефисы и тире, лишние пробелы, префикс «г.»/«город» */
export function normalizeCityText(text: string): string {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[‐‑‒–—−-]/g, ' ')
    .replace(/\./g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(?:г|город) /, '')
}

/** Сокращения, которыми город пишут чаще, чем полным названием; работают только на весь запрос целиком */
const CITY_ALIASES: Readonly<Record<string, string>> = {
  мск: 'москва',
  спб: 'санкт петербург',
  питер: 'санкт петербург',
  екб: 'екатеринбург',
  нск: 'новосибирск',
  нн: 'нижний новгород',
}

interface IndexedCity extends CityEntry {
  /** Нормализованное название */
  key: string
  /** Нормализованный регион */
  regionKey: string
}

const indexByEntry = new WeakMap<CityEntry, IndexedCity>()

function index(entry: CityEntry): IndexedCity {
  const cached = indexByEntry.get(entry)
  if (cached) {
    return cached
  }
  const indexed: IndexedCity = {
    ...entry,
    key: normalizeCityText(entry.name),
    regionKey: normalizeCityText(entry.region),
  }
  indexByEntry.set(entry, indexed)
  return indexed
}

/** Строит записи из сжатого справочника: добавляет `value` и находит повторяющиеся названия */
export function buildCityEntries(
  rows: readonly (readonly [string, number])[],
  regions: readonly string[],
): CityEntry[] {
  const counts = new Map<string, number>()
  for (const [name] of rows) {
    const key = normalizeCityText(name)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return rows.map(([name, regionIndex]) => {
    const region = regions[regionIndex] ?? ''
    const duplicated = (counts.get(normalizeCityText(name)) ?? 0) > 1
    return { name, region, value: duplicated ? `${name}, ${region}` : name }
  })
}

/** Справочник городов, крупные первыми. Грузится один раз; повторные вызовы возвращают тот же промис */
export function loadCities(): Promise<readonly CityEntry[]> {
  citiesPromise ??= import('./cities-ru').then(({ CITY_REGIONS, CITY_ROWS }) =>
    buildCityEntries(CITY_ROWS, CITY_REGIONS)
  )
  // Неудавшаяся загрузка (сеть, чанк) не должна навсегда отравить кеш
  citiesPromise.catch(() => {
    citiesPromise = undefined
  })
  return citiesPromise
}

/** Разбор запроса: «Советск, Калинин» → название и необязательная подсказка региона */
function parseQuery(text: string): { name: string; region: string } {
  const comma = text.indexOf(',')
  if (comma === -1) {
    return { name: normalizeCityText(text), region: '' }
  }
  return { name: normalizeCityText(text.slice(0, comma)), region: normalizeCityText(text.slice(comma + 1)) }
}

/**
 * Поиск по подстроке: сначала названия, начинающиеся с запроса, затем слова внутри названия, затем остальные
 * вхождения; внутри группы — крупные города выше. Пустой запрос возвращает самые крупные города.
 * После запятой можно указать регион: «Советск, Калинин».
 */
export function searchCities(cities: readonly CityEntry[], query: string, limit = 20): CityEntry[] {
  const parsed = parseQuery(query)
  const q = CITY_ALIASES[parsed.name] ?? parsed.name

  const starts: CityEntry[] = []
  const words: CityEntry[] = []
  const inside: CityEntry[] = []

  for (const entry of cities) {
    const indexed = index(entry)
    if (parsed.region && !indexed.regionKey.includes(parsed.region)) {
      continue
    }
    if (!q) {
      starts.push(entry)
      continue
    }
    const at = indexed.key.indexOf(q)
    if (at === -1) {
      continue
    }
    if (at === 0) {
      starts.push(entry)
    } else if (indexed.key[at - 1] === ' ') {
      words.push(entry)
    } else {
      inside.push(entry)
    }
  }

  return [...starts, ...words, ...inside].slice(0, limit)
}

/** `matchCity` над готовым справочником — синхронно, для тестов и для пакетной миграции */
export function matchCityIn(cities: readonly CityEntry[], text: string): CityMatch | null {
  const parsed = parseQuery(text)
  const name = CITY_ALIASES[parsed.name] ?? parsed.name
  if (!name) {
    return null
  }
  const sameName = cities.filter((entry) => index(entry).key === name)
  const candidates = parsed.region
    ? sameName.filter((entry) => index(entry).regionKey.startsWith(parsed.region))
    : sameName
  const first = candidates[0]
  if (!first) {
    return null
  }
  return { ...first, ambiguous: !parsed.region && sameName.length > 1 }
}

/**
 * Находит город справочника по тексту: «москва», «г. Москва», «Мск», «Ростов на Дону», «Советск, Калининградская».
 * `null` — такого города нет (опечатка, посёлок, другая страна): значение остаётся как есть, его можно считать
 * введённым вручную («Другой город»). Нужна для миграции старых свободных значений.
 */
export async function matchCity(text: string): Promise<CityMatch | null> {
  return matchCityIn(await loadCities(), text)
}
