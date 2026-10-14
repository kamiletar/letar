// Генератор справочника городов России для Form.Field.City (режим словаря).
//
// Источник — Wikidata (лицензия CC0): населённые пункты со статусом «город» в России плюс несколько
// классов, под которые Wikidata относит крупные города (Москва, Екатеринбург…). Запрос выполняется
// редко, результат коммитится в `src/lib/declarative/form-fields/specialized/city/cities-ru.ts`.
//
// Запуск: `node libs/forms/scripts/build-city-dataset.mjs`
// Публичный SPARQL-эндпоинт иногда отвечает 504 — запросы повторяются.

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ENDPOINT = 'https://query.wikidata.org/sparql'
const HEADERS = { 'User-Agent': 'letar-forms-city-dataset/1.0 (https://github.com/kamiletar/letar)' }
const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  '../src/lib/declarative/form-fields/specialized/city/cities-ru.ts',
)

async function sparql(query) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const response = await fetch(`${ENDPOINT}?format=json&query=${encodeURIComponent(query)}`, { headers: HEADERS })
    if (response.ok) {
      return (await response.json()).results.bindings
    }
    console.warn(`SPARQL ${response.status}, попытка ${attempt}`)
  }
  throw new Error('Wikidata не ответила')
}

/** Субъект РФ для города, который Wikidata относит сразу к нескольким (исторические вложенности) */
const REGION_OVERRIDES = {
  'Каменск-Уральский': 'Свердловская область',
  Лысьва: 'Пермский край',
  Липки: 'Тульская область',
  Богородицк: 'Тульская область',
  Петушки: 'Владимирская область',
  Вилючинск: 'Камчатский край',
  Талица: 'Свердловская область',
  Вязники: 'Владимирская область',
  Александровск: 'Пермский край',
  Плавск: 'Тульская область',
  Асино: 'Томская область',
  Пошехонье: 'Ярославская область',
  Углич: 'Ярославская область',
  Покров: 'Владимирская область',
  Ахтубинск: 'Астраханская область',
  'Урус-Мартан': 'Чечня',
  'Усть-Джегута': 'Карачаево-Черкесия',
  Холмск: 'Сахалинская область',
  Нерехта: 'Костромская область',
  Камешково: 'Владимирская область',
  Кизел: 'Пермский край',
  Лакинск: 'Владимирская область',
  Ясногорск: 'Тульская область',
  Костерёво: 'Владимирская область',
  Краснокамск: 'Пермский край',
  Сенгилей: 'Ульяновская область',
  Сердобск: 'Пензенская область',
  Кохма: 'Ивановская область',
  Собинка: 'Владимирская область',
  Сольцы: 'Новгородская область',
  Новосокольники: 'Псковская область',
  Сорск: 'Хакасия',
  Курлово: 'Владимирская область',
  'Нарьян-Мар': 'Ненецкий автономный округ',
  Моздок: 'Северная Осетия',
  Грозный: 'Чечня',
  Черкесск: 'Карачаево-Черкесия',
  Кемерово: 'Кемеровская область',
  'Гаврилов-Ям': 'Ярославская область',
  // Цепочка P131 у Wikidata оборвана
  Люберцы: 'Московская область',
  Канаш: 'Чувашия',
}

const clean = (name) => name.replace(/^(городской округ|городское поселение|город)\s+/i, '')

/**
 * Классы Wikidata, под которыми в России значатся города: общий «город», «город» без уточнения
 * (Тольятти, Абакан), «город областного значения» (Советск) и «большой город» (Екатеринбург, Челябинск)
 */
const CITY_CLASSES = ['Q7930989', 'Q515', 'Q56580425', 'Q1549591', 'Q97660032', 'Q106389302']

const cities = new Map()
for (const cls of CITY_CLASSES) {
  const found = await sparql(
    `SELECT ?c ?name ?pop WHERE { ?c wdt:P31 wd:${cls} . ?c wdt:P17 wd:Q159 . ?c rdfs:label ?name . FILTER(LANG(?name)="ru") OPTIONAL { ?c wdt:P1082 ?pop } FILTER NOT EXISTS { ?c wdt:P576 ?end } }`,
  )
  for (const b of found) {
    const id = b.c.value.split('/').pop()
    const city = cities.get(id) ?? { name: clean(b.name.value), regions: new Set(), pop: 0 }
    city.pop = Math.max(city.pop, b.pop ? Number(b.pop.value) : 0)
    cities.set(id, city)
  }
}

// Регион отдельным запросом пачками: путь P131* по всем городам разом упирается в таймаут Wikidata.
// P131* (с нулевой длиной), чтобы город федерального значения был «регионом» сам для себя
const ids = [...cities.keys()]
for (let i = 0; i < ids.length; i += 120) {
  const chunk = ids.slice(i, i + 120)
  const found = await sparql(
    `SELECT ?c ?regionName WHERE { VALUES ?c { ${
      chunk.map((id) => `wd:${id}`).join(' ')
    } } ?c wdt:P131* ?r . ?r wdt:P31 wd:Q43263 . ?r rdfs:label ?regionName . FILTER(LANG(?regionName)="ru") }`,
  )
  for (const b of found) {
    cities.get(b.c.value.split('/').pop())?.regions.add(b.regionName.value)
  }
}

// Один и тот же город мог прийти по нескольким классам под разными ярлыками — склеиваем по названию и региону
const rows = []
const unresolved = []
const seen = new Set()
for (const city of cities.values()) {
  if (city.regions.size === 0 && !REGION_OVERRIDES[city.name]) {
    console.warn(`Нет региона, пропущен: ${city.name}`)
    continue
  }
  let region
  if (REGION_OVERRIDES[city.name]) {
    region = REGION_OVERRIDES[city.name]
  } else if (city.regions.size === 1) {
    region = [...city.regions][0]
  } else {
    // Округ внутри Тюменской области: город относится к округу, а не к области
    const okrug = [...city.regions].filter((r) => r.includes('автономный округ') && r !== 'Ненецкий автономный округ')
    if (okrug.length === 1 && city.regions.has('Тюменская область')) {
      region = okrug[0]
    } else {
      unresolved.push(`${city.name}: ${[...city.regions].join(' | ')}`)
      continue
    }
  }
  const key = `${city.name}|${region}`
  if (!seen.has(key)) {
    seen.add(key)
    rows.push({ name: city.name, region, pop: city.pop })
  }
}

if (unresolved.length > 0) {
  throw new Error(`Не определён регион, добавьте в REGION_OVERRIDES:\n${unresolved.join('\n')}`)
}

// Крупные первыми: индекс строки — ранг при сортировке выдачи
rows.sort((a, b) => b.pop - a.pop || a.name.localeCompare(b.name, 'ru'))
const regions = [...new Set(rows.map((r) => r.region))].sort((a, b) => a.localeCompare(b, 'ru'))
const regionIndex = new Map(regions.map((r, i) => [r, i]))
const q = (s) => JSON.stringify(s)

const source = `// Сгенерировано libs/forms/scripts/build-city-dataset.mjs — не править руками.
// Источник: Wikidata (CC0), населённые пункты со статусом «город» в России, порядок — по убыванию населения
// (индекс строки = ранг для сортировки выдачи).

/** Субъекты РФ: индекс из строки справочника ссылается сюда */
export const CITY_REGIONS: readonly string[] = [
${regions.map((r) => `  ${q(r)},`).join('\n')}
]

/** Города: [название, индекс в CITY_REGIONS], крупные первыми */
export const CITY_ROWS: readonly (readonly [string, number])[] = [
${rows.map((r) => `  [${q(r.name)}, ${regionIndex.get(r.region)}],`).join('\n')}
]
`

import { mkdirSync } from 'node:fs'
mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, source)
console.log(`Городов: ${rows.length}, регионов: ${regions.length} → ${OUT}`)
