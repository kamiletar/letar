// CDEK API v2 — доменно-нейтральный клиент (без привязки к конкретному приложению)

import type {
  CdekCityItem,
  CdekDeliveryPoint,
  CdekLocation,
  CdekOrderRequest,
  CdekOrderResponse,
  CdekOrderStatusResponse,
  CdekPackageDims,
  CdekShippingCosts,
  CdekTariffListItem,
  CdekTariffListResponse,
  CdekTokenResponse,
} from './cdek-types'

const TARIFF_POINT = 136
const TARIFF_DOOR = 137

let cachedToken: string | null = null
let tokenExpiresAt = 0

function getBaseUrl(): string {
  return process.env.CDEK_TEST_MODE === 'true' ? 'https://api.edu.cdek.ru' : 'https://api.cdek.ru'
}

/** Адрес отправителя из ENV */
export function getFromLocation(): CdekLocation {
  return {
    postal_code: process.env.CDEK_FROM_POSTAL_CODE ?? '140013',
    city: process.env.CDEK_FROM_CITY ?? 'Москва',
    address: process.env.CDEK_FROM_ADDRESS ?? 'Рождественская ул., 8',
  }
}

/** Получает OAuth-токен. Кэширует с буфером 5 минут. */
export async function getCdekToken(): Promise<string | null> {
  const clientId = process.env.CDEK_CLIENT_ID
  const clientSecret = process.env.CDEK_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return null
  }

  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken
  }

  try {
    const tokenUrl = `${getBaseUrl()}/v2/oauth/token`
    console.log('[cdek] getCdekToken url:', tokenUrl, 'client_id:', clientId.slice(0, 8) + '...')
    const resp = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
      signal: AbortSignal.timeout(8_000),
    })
    if (!resp.ok) {
      const body = await resp.text().catch(() => '')
      console.error('[cdek] token error', resp.status, body.slice(0, 200))
      return null
    }
    const data = (await resp.json()) as CdekTokenResponse
    cachedToken = data.access_token
    tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000
    console.log('[cdek] token ok, expires_in:', data.expires_in)
    return cachedToken
  } catch (err) {
    console.error('[cdek] token fetch error:', err)
    return null
  }
}

/**
 * Рассчитывает стоимость доставки по тарифам 136 и 137.
 * Доменно-нейтральный: принимает готовые габариты посылки.
 * Каждое приложение само строит CdekPackageDims из своей доменной логики.
 */
export async function calculateTariffs(
  to: CdekLocation,
  pkg: CdekPackageDims,
  from?: CdekLocation
): Promise<CdekShippingCosts> {
  if (process.env.CDEK_MOCK_MODE === 'true') {
    await new Promise((r) => setTimeout(r, 400))
    return { point: 45000, door: 65000, periodMin: 2, periodMax: 4 }
  }

  const token = await getCdekToken()
  if (!token) {
    return { point: null, door: null, periodMin: null, periodMax: null, error: 'CDEK_NO_TOKEN' }
  }

  const fromLocation = from ?? getFromLocation()

  try {
    const resp = await fetch(`${getBaseUrl()}/v2/calculator/tarifflist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        from_location: fromLocation,
        to_location: to,
        packages: [pkg],
      }),
      signal: AbortSignal.timeout(8_000),
    })

    if (!resp.ok) {
      console.warn('[cdek] tarifflist HTTP error', resp.status)
      return { point: null, door: null, periodMin: null, periodMax: null, error: 'HTTP_ERROR' }
    }

    const data = (await resp.json()) as CdekTariffListResponse
    const tariffs: CdekTariffListItem[] = data.tariff_codes ?? []

    const pointTariff = tariffs.find((t) => t.tariff_code === TARIFF_POINT)
    const doorTariff = tariffs.find((t) => t.tariff_code === TARIFF_DOOR)

    const point = pointTariff ? Math.round(pointTariff.delivery_sum * 100) : null
    const door = doorTariff ? Math.round(doorTariff.delivery_sum * 100) : null
    const periodMin = pointTariff?.period_min ?? doorTariff?.period_min ?? null
    const periodMax = pointTariff?.period_max ?? doorTariff?.period_max ?? null

    return { point, door, periodMin, periodMax }
  } catch (err) {
    console.warn('[cdek] tarifflist error', err)
    return { point: null, door: null, periodMin: null, periodMax: null, error: 'FETCH_ERROR' }
  }
}

// ---------------------------------------------------------------------------
// Моковые данные для CDEK_MOCK_MODE
// ---------------------------------------------------------------------------

const MOCK_CITIES: CdekCityItem[] = [
  { code: 44, city: 'Москва', sub_region: '', region: 'Москва', country_code: 'RU', postal_codes: ['101000'] },
  {
    code: 137,
    city: 'Санкт-Петербург',
    sub_region: '',
    region: 'Санкт-Петербург',
    country_code: 'RU',
    postal_codes: ['190000'],
  },
  {
    code: 270,
    city: 'Екатеринбург',
    sub_region: '',
    region: 'Свердловская область',
    country_code: 'RU',
    postal_codes: ['620000'],
  },
  {
    code: 63,
    city: 'Новосибирск',
    sub_region: '',
    region: 'Новосибирская область',
    country_code: 'RU',
    postal_codes: ['630000'],
  },
  {
    code: 51,
    city: 'Казань',
    sub_region: '',
    region: 'Республика Татарстан',
    country_code: 'RU',
    postal_codes: ['420000'],
  },
  {
    code: 255,
    city: 'Краснодар',
    sub_region: '',
    region: 'Краснодарский край',
    country_code: 'RU',
    postal_codes: ['350000'],
  },
  {
    code: 407,
    city: 'Нижний Новгород',
    sub_region: '',
    region: 'Нижегородская область',
    country_code: 'RU',
    postal_codes: ['603000'],
  },
  {
    code: 540,
    city: 'Ростов-на-Дону',
    sub_region: '',
    region: 'Ростовская область',
    country_code: 'RU',
    postal_codes: ['344000'],
  },
  {
    code: 173,
    city: 'Уфа',
    sub_region: '',
    region: 'Республика Башкортостан',
    country_code: 'RU',
    postal_codes: ['450000'],
  },
  {
    code: 99,
    city: 'Самара',
    sub_region: '',
    region: 'Самарская область',
    country_code: 'RU',
    postal_codes: ['443000'],
  },
  {
    code: 179,
    city: 'Воронеж',
    sub_region: '',
    region: 'Воронежская область',
    country_code: 'RU',
    postal_codes: ['394000'],
  },
  { code: 195, city: 'Пермь', sub_region: '', region: 'Пермский край', country_code: 'RU', postal_codes: ['614000'] },
  {
    code: 321,
    city: 'Челябинск',
    sub_region: '',
    region: 'Челябинская область',
    country_code: 'RU',
    postal_codes: ['454000'],
  },
  {
    code: 78,
    city: 'Красноярск',
    sub_region: '',
    region: 'Красноярский край',
    country_code: 'RU',
    postal_codes: ['660000'],
  },
  { code: 380, city: 'Омск', sub_region: '', region: 'Омская область', country_code: 'RU', postal_codes: ['644000'] },
]

function filterMockCities(query: string): CdekCityItem[] {
  const q = query.toLowerCase()
  return MOCK_CITIES.filter((c) => c.city.toLowerCase().startsWith(q)).slice(0, 8)
}

export const MOCK_PVZ: CdekDeliveryPoint[] = [
  {
    code: 'MSK1',
    name: 'ПВЗ Красная Пресня',
    location: {
      city: 'Москва',
      address: 'ул. Красная Пресня, 28',
      address_full: 'г. Москва, ул. Красная Пресня, 28',
      latitude: 55.76,
      longitude: 37.571,
      postal_code: '123022',
    },
    work_time: 'Пн-Вс: 09:00-21:00',
    type: 'PVZ',
    is_handout: true,
  },
  {
    code: 'MSK2',
    name: 'ПВЗ Арбат',
    location: {
      city: 'Москва',
      address: 'ул. Арбат, 14',
      address_full: 'г. Москва, ул. Арбат, 14',
      latitude: 55.751,
      longitude: 37.589,
      postal_code: '119002',
    },
    work_time: 'Пн-Пт: 10:00-20:00, Сб-Вс: 11:00-18:00',
    type: 'PVZ',
    is_handout: true,
  },
  {
    code: 'MSK3',
    name: 'ПВЗ Таганская',
    location: {
      city: 'Москва',
      address: 'ул. Таганская, 1',
      address_full: 'г. Москва, ул. Таганская, 1',
      latitude: 55.739,
      longitude: 37.653,
      postal_code: '109147',
    },
    work_time: 'Пн-Вс: 08:00-22:00',
    type: 'PVZ',
    is_handout: true,
  },
  {
    code: 'MSK4',
    name: 'ПВЗ Войковская',
    location: {
      city: 'Москва',
      address: 'Ленинградское шоссе, 10',
      address_full: 'г. Москва, Ленинградское шоссе, 10',
      latitude: 55.82,
      longitude: 37.497,
      postal_code: '125171',
    },
    work_time: 'Пн-Вс: 10:00-20:00',
    type: 'PVZ',
    is_handout: true,
  },
  {
    code: 'MSK5',
    name: 'ПВЗ Академическая',
    location: {
      city: 'Москва',
      address: 'ул. Профсоюзная, 3',
      address_full: 'г. Москва, ул. Профсоюзная, 3',
      latitude: 55.692,
      longitude: 37.567,
      postal_code: '117036',
    },
    work_time: 'Пн-Пт: 09:00-21:00',
    type: 'PVZ',
    is_handout: true,
  },
  {
    code: 'MSK6',
    name: 'ПВЗ Марьина Роща',
    location: {
      city: 'Москва',
      address: 'ул. Шереметьевская, 33',
      address_full: 'г. Москва, ул. Шереметьевская, 33',
      latitude: 55.797,
      longitude: 37.617,
      postal_code: '127521',
    },
    work_time: 'Пн-Вс: 09:00-20:00',
    type: 'PVZ',
    is_handout: true,
  },
  {
    code: 'MSK7',
    name: 'ПВЗ Сокольники',
    location: {
      city: 'Москва',
      address: 'ул. Сокольническая, 4',
      address_full: 'г. Москва, ул. Сокольническая, 4',
      latitude: 55.784,
      longitude: 37.678,
      postal_code: '107113',
    },
    work_time: 'Пн-Пт: 10:00-21:00',
    type: 'PVZ',
    is_handout: true,
  },
  {
    code: 'MSK8',
    name: 'ПВЗ Измайлово',
    location: {
      city: 'Москва',
      address: 'Измайловское шоссе, 71',
      address_full: 'г. Москва, Измайловское шоссе, 71',
      latitude: 55.789,
      longitude: 37.748,
      postal_code: '105077',
    },
    work_time: 'Пн-Вс: 09:00-21:00',
    type: 'PVZ',
    is_handout: true,
  },
  {
    code: 'MSK9',
    name: 'ПВЗ Кузьминки',
    location: {
      city: 'Москва',
      address: 'Волгоградский просп., 137',
      address_full: 'г. Москва, Волгоградский просп., 137',
      latitude: 55.714,
      longitude: 37.782,
      postal_code: '109548',
    },
    work_time: 'Пн-Вс: 10:00-22:00',
    type: 'PVZ',
    is_handout: true,
  },
  {
    code: 'MSK10',
    name: 'ПВЗ Царицыно',
    location: {
      city: 'Москва',
      address: 'ул. Луганская, 5',
      address_full: 'г. Москва, ул. Луганская, 5',
      latitude: 55.624,
      longitude: 37.666,
      postal_code: '115516',
    },
    work_time: 'Пн-Пт: 09:00-21:00',
    type: 'PVZ',
    is_handout: true,
  },
  {
    code: 'MSK11',
    name: 'ПВЗ Митино',
    location: {
      city: 'Москва',
      address: 'Пятницкое шоссе, 18',
      address_full: 'г. Москва, Пятницкое шоссе, 18',
      latitude: 55.842,
      longitude: 37.362,
      postal_code: '125430',
    },
    work_time: 'Пн-Вс: 10:00-20:00',
    type: 'PVZ',
    is_handout: true,
  },
  {
    code: 'MSK12',
    name: 'ПВЗ Тушино',
    location: {
      city: 'Москва',
      address: 'Волоколамское шоссе, 73',
      address_full: 'г. Москва, Волоколамское шоссе, 73',
      latitude: 55.832,
      longitude: 37.43,
      postal_code: '125362',
    },
    work_time: 'Пн-Пт: 09:00-21:00',
    type: 'PVZ',
    is_handout: true,
  },
  {
    code: 'MSK13',
    name: 'ПВЗ Бибирево',
    location: {
      city: 'Москва',
      address: 'ул. Конёнкова, 28',
      address_full: 'г. Москва, ул. Конёнкова, 28',
      latitude: 55.879,
      longitude: 37.589,
      postal_code: '127591',
    },
    work_time: 'Пн-Вс: 10:00-21:00',
    type: 'PVZ',
    is_handout: true,
  },
  {
    code: 'MSK14',
    name: 'ПВЗ Орехово',
    location: {
      city: 'Москва',
      address: 'Ореховый бульвар, 15',
      address_full: 'г. Москва, Ореховый бульвар, 15',
      latitude: 55.618,
      longitude: 37.717,
      postal_code: '115573',
    },
    work_time: 'Пн-Вс: 09:00-22:00',
    type: 'PVZ',
    is_handout: true,
  },
  {
    code: 'MSK15',
    name: 'ПВЗ Крылатское',
    location: {
      city: 'Москва',
      address: 'Осенний бульвар, 10',
      address_full: 'г. Москва, Осенний бульвар, 10',
      latitude: 55.756,
      longitude: 37.37,
      postal_code: '121614',
    },
    work_time: 'Пн-Пт: 10:00-20:00',
    type: 'PVZ',
    is_handout: true,
  },
  {
    code: 'MSK16',
    name: 'ПВЗ Бутово',
    location: {
      city: 'Москва',
      address: 'Южнобутовская ул., 13',
      address_full: 'г. Москва, Южнобутовская ул., 13',
      latitude: 55.564,
      longitude: 37.57,
      postal_code: '142700',
    },
    work_time: 'Пн-Вс: 09:00-21:00',
    type: 'PVZ',
    is_handout: true,
  },
  {
    code: 'MSK17',
    name: 'ПВЗ Перово',
    location: {
      city: 'Москва',
      address: 'ул. Перовская, 7',
      address_full: 'г. Москва, ул. Перовская, 7',
      latitude: 55.745,
      longitude: 37.794,
      postal_code: '111141',
    },
    work_time: 'Пн-Вс: 10:00-21:00',
    type: 'PVZ',
    is_handout: true,
  },
  {
    code: 'MSK18',
    name: 'ПВЗ Строгино',
    location: {
      city: 'Москва',
      address: 'Строгинский бульвар, 14',
      address_full: 'г. Москва, Строгинский бульвар, 14',
      latitude: 55.803,
      longitude: 37.343,
      postal_code: '123181',
    },
    work_time: 'Пн-Пт: 09:00-20:00',
    type: 'PVZ',
    is_handout: true,
  },
  {
    code: 'MSK19',
    name: 'ПВЗ Медведково',
    location: {
      city: 'Москва',
      address: 'Заревый проезд, 12',
      address_full: 'г. Москва, Заревый проезд, 12',
      latitude: 55.874,
      longitude: 37.659,
      postal_code: '127224',
    },
    work_time: 'Пн-Вс: 10:00-22:00',
    type: 'PVZ',
    is_handout: true,
  },
  {
    code: 'MSK20',
    name: 'ПВЗ Чертаново',
    location: {
      city: 'Москва',
      address: 'Чертановская ул., 54',
      address_full: 'г. Москва, Чертановская ул., 54',
      latitude: 55.64,
      longitude: 37.606,
      postal_code: '117449',
    },
    work_time: 'Пн-Пт: 10:00-21:00',
    type: 'PVZ',
    is_handout: true,
  },
]

/** Ищет города CDEK по строке запроса. */
export async function searchCdekCities(query: string): Promise<CdekCityItem[]> {
  if (process.env.CDEK_MOCK_MODE === 'true') {
    await new Promise((r) => setTimeout(r, 150))
    return filterMockCities(query)
  }

  const token = await getCdekToken()
  if (!token) {
    console.error('[cdek] searchCdekCities: no token for query:', query)
    return []
  }

  try {
    const citiesUrl = `${getBaseUrl()}/v2/location/cities?${new URLSearchParams({
      city: query,
      country_codes: 'RU',
      size: '10',
    })}`
    console.log('[cdek] searchCdekCities url:', citiesUrl)
    const resp = await fetch(citiesUrl, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8_000),
    })
    if (!resp.ok) {
      const body = await resp.text().catch(() => '')
      console.error('[cdek] cities error', resp.status, body.slice(0, 200))
      return []
    }
    const cities = ((await resp.json()) as CdekCityItem[]).slice(0, 10)
    console.log('[cdek] cities found:', cities.length, 'for query:', query)
    return cities
  } catch {
    return []
  }
}

/** Ищет CDEK city_code по почтовому индексу. */
export async function getCityCodeByPostalCode(postalCode: string): Promise<number | null> {
  if (process.env.CDEK_MOCK_MODE === 'true') {
    await new Promise((r) => setTimeout(r, 150))
    // MOCK_PVZ — только Москва, поэтому мок-код города всегда Москвы (44) независимо от индекса,
    // getDeliveryPoints() в мок-режиме тоже игнорирует cityCode и отдаёт тот же список.
    return MOCK_CITIES.find((c) => c.postal_codes.some((code) => code.startsWith(postalCode.slice(0, 3))))?.code ?? 44
  }

  const token = await getCdekToken()
  if (!token) {
    return null
  }

  try {
    const resp = await fetch(`${getBaseUrl()}/v2/location/cities?${new URLSearchParams({ postal_code: postalCode })}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8_000),
    })
    if (!resp.ok) {
      return null
    }
    const cities = (await resp.json()) as CdekCityItem[]
    return cities[0]?.code ?? null
  } catch {
    return null
  }
}

/** Возвращает список ПВЗ по city_code CDEK. */
export async function getDeliveryPoints(cityCode: number): Promise<CdekDeliveryPoint[]> {
  if (process.env.CDEK_MOCK_MODE === 'true') {
    await new Promise((r) => setTimeout(r, 300))
    return MOCK_PVZ
  }

  const token = await getCdekToken()
  if (!token) {
    return []
  }

  try {
    const resp = await fetch(
      `${getBaseUrl()}/v2/deliverypoints?${new URLSearchParams({
        city_code: String(cityCode),
        type: 'PVZ',
        is_handout: 'true',
      })}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8_000),
      }
    )
    if (!resp.ok) {
      return []
    }
    return ((await resp.json()) as CdekDeliveryPoint[]).slice(0, 300)
  } catch {
    return []
  }
}

/** Создаёт заказ СДЭК. Возвращает uuid и трек-номер или объект с ошибкой. */
export async function createCdekOrder(
  request: CdekOrderRequest
): Promise<{ uuid: string; trackNumber?: string } | { error: string }> {
  const token = await getCdekToken()
  if (!token) {
    return { error: 'Нет токена СДЭК — проверьте CDEK_CLIENT_ID/SECRET' }
  }

  let resp: Response
  try {
    resp = await fetch(`${getBaseUrl()}/v2/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(15_000),
    })
  } catch (err) {
    console.warn('[cdek] createOrder fetch error', err)
    return { error: `Сетевая ошибка СДЭК: ${String(err)}` }
  }

  let data: CdekOrderResponse
  try {
    data = (await resp.json()) as CdekOrderResponse
  } catch {
    return { error: `СДЭК вернул не-JSON ответ (HTTP ${resp.status})` }
  }

  if (!data.entity?.uuid) {
    const errors = data.requests?.[0]?.errors
    const msg =
      Array.isArray(errors) && errors.length > 0
        ? errors
            .map((e) => e.message)
            .filter(Boolean)
            .join('; ')
        : `HTTP ${resp.status}, нет entity.uuid`
    console.warn('[cdek] createOrder error', JSON.stringify(data))
    return { error: `СДЭК API: ${msg}` }
  }

  return { uuid: data.entity.uuid, trackNumber: data.entity.track_number ?? undefined }
}

/** Запрашивает статус заказа СДЭК по UUID. */
export async function getCdekOrderStatus(cdekUuid: string): Promise<CdekOrderStatusResponse['entity'] | null> {
  const token = await getCdekToken()
  if (!token) {
    return null
  }

  try {
    const resp = await fetch(`${getBaseUrl()}/v2/orders/${cdekUuid}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8_000),
    })
    if (!resp.ok) {
      return null
    }
    const data = (await resp.json()) as CdekOrderStatusResponse
    return data.entity ?? null
  } catch {
    return null
  }
}

async function getCdekWebhooks(token: string): Promise<Array<{ uuid: string; url: string; type: string }>> {
  try {
    const resp = await fetch(`${getBaseUrl()}/v2/webhooks`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8_000),
    })
    if (!resp.ok) {
      return []
    }
    const data = (await resp.json()) as Array<{ uuid: string; url: string; type: string }>
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

/**
 * Регистрирует вебхук ORDER_STATUS если ещё не зарегистрирован.
 * Идемпотентен — проверяет существующие вебхуки перед созданием.
 */
export async function ensureCdekWebhook(url: string): Promise<boolean> {
  const token = await getCdekToken()
  if (!token) {
    return false
  }

  const existing = await getCdekWebhooks(token)
  if (existing.some((wh) => wh.type === 'ORDER_STATUS' && wh.url === url)) {
    console.log('[cdek] webhook already registered:', url)
    return true
  }

  try {
    const resp = await fetch(`${getBaseUrl()}/v2/webhooks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ type: 'ORDER_STATUS', url }),
      signal: AbortSignal.timeout(8_000),
    })
    if (resp.ok) {
      console.log('[cdek] webhook registered:', url)
    } else {
      console.error('[cdek] webhook registration failed:', resp.status)
    }
    return resp.ok
  } catch (err) {
    console.error('[cdek] webhook registration error:', err)
    return false
  }
}
