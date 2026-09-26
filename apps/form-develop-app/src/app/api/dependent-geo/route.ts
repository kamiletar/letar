import { NextResponse } from 'next/server'

/**
 * Справочник «страна → регион → город» для демо зависимых селектов (`/dependent-select-demo`): статичные данные
 * за настоящим HTTP-запросом, чтобы e2e мог задерживать и считать ответы через `page.route`.
 */
interface GeoRecord {
  id: string
  name: string
}

const COUNTRIES: GeoRecord[] = [
  { id: 'RU', name: 'Россия' },
  { id: 'DE', name: 'Германия' },
  { id: 'FR', name: 'Франция' },
]

const REGIONS: Record<string, GeoRecord[]> = {
  RU: [
    { id: 'RU-MOW', name: 'Москва' },
    { id: 'RU-SPE', name: 'Санкт-Петербург' },
  ],
  DE: [
    { id: 'DE-BE', name: 'Берлин' },
    { id: 'DE-BY', name: 'Бавария' },
  ],
  FR: [{ id: 'FR-IDF', name: 'Иль-де-Франс' }],
}

const CITIES: Record<string, GeoRecord[]> = {
  'RU-MOW': [{ id: 'msk', name: 'Москва' }, { id: 'zelenograd', name: 'Зеленоград' }],
  'RU-SPE': [{ id: 'spb', name: 'Санкт-Петербург' }, { id: 'pushkin', name: 'Пушкин' }],
  'DE-BE': [{ id: 'berlin', name: 'Берлин' }],
  'DE-BY': [{ id: 'munich', name: 'Мюнхен' }, { id: 'nuremberg', name: 'Нюрнберг' }],
  'FR-IDF': [{ id: 'paris', name: 'Париж' }, { id: 'versailles', name: 'Версаль' }],
}

export function GET(request: Request): NextResponse {
  const { searchParams } = new URL(request.url)
  const kind = searchParams.get('kind')
  const parent = searchParams.get('parent') ?? ''
  const search = (searchParams.get('search') ?? '').trim().toLowerCase()
  const list = kind === 'regions' ? (REGIONS[parent] ?? []) : kind === 'cities' ? (CITIES[parent] ?? []) : COUNTRIES
  const filtered = search ? list.filter((item) => item.name.toLowerCase().includes(search)) : list
  return NextResponse.json(filtered)
}
