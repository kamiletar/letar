// Тесты для CDEK API v2 клиента.
// Модуль хранит module-scope кэш токена (cachedToken/tokenExpiresAt), поэтому для изоляции
// между тестами каждый тест сам загружает свежий инстанс модуля через vi.resetModules() + import().

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as CdekClientModule from './cdek-client.js'
import type { CdekOrderRequest, CdekPackageDims } from './cdek-types.js'

const ENV_KEYS = [
  'CDEK_TEST_MODE',
  'CDEK_MOCK_MODE',
  'CDEK_CLIENT_ID',
  'CDEK_CLIENT_SECRET',
  'CDEK_FROM_POSTAL_CODE',
  'CDEK_FROM_CITY',
  'CDEK_FROM_ADDRESS',
] as const

let originalEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>

beforeEach(() => {
  originalEnv = {}
  for (const key of ENV_KEYS) {
    originalEnv[key] = process.env[key]
  }
})

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key]
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

/** Загружает свежий инстанс модуля — сбрасывает module-scope кэш токена. */
async function loadClient(): Promise<typeof CdekClientModule> {
  vi.resetModules()
  return import('./cdek-client.js')
}

function setCreds(): void {
  process.env.CDEK_CLIENT_ID = 'client-id-123'
  process.env.CDEK_CLIENT_SECRET = 'client-secret-456'
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response
}

const TOKEN_BODY = { access_token: 'token-abc', token_type: 'Bearer', expires_in: 3600, scope: 'test' }

describe('getFromLocation', () => {
  it('возвращает дефолтные значения без ENV', async () => {
    delete process.env.CDEK_FROM_POSTAL_CODE
    delete process.env.CDEK_FROM_CITY
    delete process.env.CDEK_FROM_ADDRESS
    const { getFromLocation } = await loadClient()

    expect(getFromLocation()).toEqual({
      postal_code: '140013',
      city: 'Москва',
      address: 'Рождественская ул., 8',
    })
  })

  it('переопределяется через ENV', async () => {
    process.env.CDEK_FROM_POSTAL_CODE = '190000'
    process.env.CDEK_FROM_CITY = 'Санкт-Петербург'
    process.env.CDEK_FROM_ADDRESS = 'Невский пр., 1'
    const { getFromLocation } = await loadClient()

    expect(getFromLocation()).toEqual({
      postal_code: '190000',
      city: 'Санкт-Петербург',
      address: 'Невский пр., 1',
    })
  })
})

describe('getCdekToken', () => {
  it('возвращает null если нет CDEK_CLIENT_ID/SECRET', async () => {
    delete process.env.CDEK_CLIENT_ID
    delete process.env.CDEK_CLIENT_SECRET
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { getCdekToken } = await loadClient()

    const token = await getCdekToken()

    expect(token).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('успешно получает токен и формирует правильный запрос (production URL)', async () => {
    setCreds()
    delete process.env.CDEK_TEST_MODE
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(TOKEN_BODY))
    vi.stubGlobal('fetch', fetchMock)
    const { getCdekToken } = await loadClient()

    const token = await getCdekToken()

    expect(token).toBe('token-abc')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.cdek.ru/v2/oauth/token')
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'Content-Type': 'application/x-www-form-urlencoded' })
    const body = init.body as URLSearchParams
    expect(body.get('grant_type')).toBe('client_credentials')
    expect(body.get('client_id')).toBe('client-id-123')
    expect(body.get('client_secret')).toBe('client-secret-456')
  })

  it('использует тестовый URL при CDEK_TEST_MODE=true', async () => {
    setCreds()
    process.env.CDEK_TEST_MODE = 'true'
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(TOKEN_BODY))
    vi.stubGlobal('fetch', fetchMock)
    const { getCdekToken } = await loadClient()

    await getCdekToken()

    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toBe('https://api.edu.cdek.ru/v2/oauth/token')
  })

  it('кэширует токен — повторный вызов в пределах TTL не делает новый запрос', async () => {
    setCreds()
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(TOKEN_BODY))
    vi.stubGlobal('fetch', fetchMock)
    const { getCdekToken } = await loadClient()

    const first = await getCdekToken()
    const second = await getCdekToken()

    expect(first).toBe('token-abc')
    expect(second).toBe('token-abc')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('после истечения TTL делает новый запрос за токеном', async () => {
    setCreds()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ ...TOKEN_BODY, access_token: 'token-1', expires_in: 600 }))
      .mockResolvedValueOnce(jsonResponse({ ...TOKEN_BODY, access_token: 'token-2', expires_in: 600 }))
    vi.stubGlobal('fetch', fetchMock)
    const { getCdekToken } = await loadClient()

    const first = await getCdekToken()
    expect(first).toBe('token-1')

    // expires_in=600, буфер 300с → истекает через 300с. Сдвигаем на 301с вперёд.
    vi.setSystemTime(new Date('2026-01-01T00:05:01Z'))

    const second = await getCdekToken()

    expect(second).toBe('token-2')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('возвращает null при HTTP-ошибке', async () => {
    setCreds()
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: 'invalid_client' }, false, 401))
    vi.stubGlobal('fetch', fetchMock)
    const { getCdekToken } = await loadClient()

    const token = await getCdekToken()

    expect(token).toBeNull()
  })

  it('возвращает null при сетевой ошибке fetch', async () => {
    setCreds()
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'))
    vi.stubGlobal('fetch', fetchMock)
    const { getCdekToken } = await loadClient()

    const token = await getCdekToken()

    expect(token).toBeNull()
  })
})

describe('calculateTariffs', () => {
  const to = { postal_code: '190000', city: 'Санкт-Петербург' }
  const pkg: CdekPackageDims = { weight: 1000, length: 20, width: 15, height: 10 }

  it('в CDEK_MOCK_MODE возвращает фиксированные значения без сети', async () => {
    process.env.CDEK_MOCK_MODE = 'true'
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { calculateTariffs } = await loadClient()

    const result = await calculateTariffs(to, pkg)

    expect(result).toEqual({ point: 45000, door: 65000, periodMin: 2, periodMax: 4 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('возвращает CDEK_NO_TOKEN если нет учётных данных', async () => {
    delete process.env.CDEK_CLIENT_ID
    delete process.env.CDEK_CLIENT_SECRET
    const { calculateTariffs } = await loadClient()

    const result = await calculateTariffs(to, pkg)

    expect(result).toEqual({ point: null, door: null, periodMin: null, periodMax: null, error: 'CDEK_NO_TOKEN' })
  })

  it('парсит тарифы 136 (point) и 137 (door), переводит в копейки', async () => {
    setCreds()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(TOKEN_BODY))
      .mockResolvedValueOnce(jsonResponse({
        tariff_codes: [
          {
            tariff_code: 136,
            tariff_name: 'point',
            tariff_description: '',
            delivery_mode: 1,
            delivery_sum: 450.5,
            period_min: 2,
            period_max: 4,
            calendar_min: 2,
            calendar_max: 4,
          },
          {
            tariff_code: 137,
            tariff_name: 'door',
            tariff_description: '',
            delivery_mode: 1,
            delivery_sum: 650,
            period_min: 3,
            period_max: 5,
            calendar_min: 3,
            calendar_max: 5,
          },
        ],
      }))
    vi.stubGlobal('fetch', fetchMock)
    const { calculateTariffs } = await loadClient()

    const result = await calculateTariffs(to, pkg)

    expect(result).toEqual({ point: 45050, door: 65000, periodMin: 2, periodMax: 4 })

    const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(url).toBe('https://api.cdek.ru/v2/calculator/tarifflist')
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer token-abc' })
    const body = JSON.parse(init.body as string)
    expect(body).toEqual({
      from_location: { postal_code: '140013', city: 'Москва', address: 'Рождественская ул., 8' },
      to_location: to,
      packages: [pkg],
    })
  })

  it('использует переданный from вместо getFromLocation()', async () => {
    setCreds()
    const customFrom = { postal_code: '620000', city: 'Екатеринбург' }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(TOKEN_BODY))
      .mockResolvedValueOnce(jsonResponse({ tariff_codes: [] }))
    vi.stubGlobal('fetch', fetchMock)
    const { calculateTariffs } = await loadClient()

    await calculateTariffs(to, pkg, customFrom)

    const [, init] = fetchMock.mock.calls[1] as [string, RequestInit]
    const body = JSON.parse(init.body as string)
    expect(body.from_location).toEqual(customFrom)
  })

  it('возвращает HTTP_ERROR при неуспешном ответе', async () => {
    setCreds()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(TOKEN_BODY))
      .mockResolvedValueOnce(jsonResponse({}, false, 500))
    vi.stubGlobal('fetch', fetchMock)
    const { calculateTariffs } = await loadClient()

    const result = await calculateTariffs(to, pkg)

    expect(result).toEqual({ point: null, door: null, periodMin: null, periodMax: null, error: 'HTTP_ERROR' })
  })

  it('возвращает FETCH_ERROR при сетевой ошибке', async () => {
    setCreds()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(TOKEN_BODY))
      .mockRejectedValueOnce(new Error('boom'))
    vi.stubGlobal('fetch', fetchMock)
    const { calculateTariffs } = await loadClient()

    const result = await calculateTariffs(to, pkg)

    expect(result).toEqual({ point: null, door: null, periodMin: null, periodMax: null, error: 'FETCH_ERROR' })
  })

  it('когда есть только door-тариф, periodMin/periodMax берутся из него', async () => {
    setCreds()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(TOKEN_BODY))
      .mockResolvedValueOnce(jsonResponse({
        tariff_codes: [
          {
            tariff_code: 137,
            tariff_name: 'door',
            tariff_description: '',
            delivery_mode: 1,
            delivery_sum: 700,
            period_min: 5,
            period_max: 7,
            calendar_min: 5,
            calendar_max: 7,
          },
        ],
      }))
    vi.stubGlobal('fetch', fetchMock)
    const { calculateTariffs } = await loadClient()

    const result = await calculateTariffs(to, pkg)

    expect(result).toEqual({ point: null, door: 70000, periodMin: 5, periodMax: 7 })
  })
})

describe('searchCdekCities', () => {
  it('в CDEK_MOCK_MODE фильтрует по префиксу без учёта регистра, максимум 8', async () => {
    process.env.CDEK_MOCK_MODE = 'true'
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { searchCdekCities } = await loadClient()

    const result = await searchCdekCities('москв')

    expect(result).toHaveLength(1)
    expect(result[0]?.city).toBe('Москва')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('возвращает [] если нет токена', async () => {
    delete process.env.CDEK_CLIENT_ID
    delete process.env.CDEK_CLIENT_SECRET
    const { searchCdekCities } = await loadClient()

    const result = await searchCdekCities('Москва')

    expect(result).toEqual([])
  })

  it('успешно возвращает города, максимум 10, с правильным URL', async () => {
    setCreds()
    const cities = Array.from({ length: 15 }, (_, i) => ({
      code: i,
      city: `City${i}`,
      sub_region: '',
      region: '',
      country_code: 'RU',
      postal_codes: [],
    }))
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(TOKEN_BODY))
      .mockResolvedValueOnce(jsonResponse(cities))
    vi.stubGlobal('fetch', fetchMock)
    const { searchCdekCities } = await loadClient()

    const result = await searchCdekCities('City')

    expect(result).toHaveLength(10)
    const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(url).toBe('https://api.cdek.ru/v2/location/cities?city=City&country_codes=RU&size=10')
    expect(init.headers).toEqual({ Authorization: 'Bearer token-abc' })
  })

  it('возвращает [] при HTTP-ошибке', async () => {
    setCreds()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(TOKEN_BODY))
      .mockResolvedValueOnce(jsonResponse({}, false, 500))
    vi.stubGlobal('fetch', fetchMock)
    const { searchCdekCities } = await loadClient()

    const result = await searchCdekCities('Москва')

    expect(result).toEqual([])
  })

  it('возвращает [] при сетевой ошибке', async () => {
    setCreds()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(TOKEN_BODY))
      .mockRejectedValueOnce(new Error('boom'))
    vi.stubGlobal('fetch', fetchMock)
    const { searchCdekCities } = await loadClient()

    const result = await searchCdekCities('Москва')

    expect(result).toEqual([])
  })
})

describe('getCityCodeByPostalCode', () => {
  it('в CDEK_MOCK_MODE находит код по префиксу почтового индекса', async () => {
    process.env.CDEK_MOCK_MODE = 'true'
    const { getCityCodeByPostalCode } = await loadClient()

    const result = await getCityCodeByPostalCode('190004')

    expect(result).toBe(137) // Санкт-Петербург
  })

  it('в CDEK_MOCK_MODE возвращает 44 (Москва) по умолчанию, если совпадений нет', async () => {
    process.env.CDEK_MOCK_MODE = 'true'
    const { getCityCodeByPostalCode } = await loadClient()

    const result = await getCityCodeByPostalCode('999999')

    expect(result).toBe(44)
  })

  it('возвращает null если нет токена', async () => {
    delete process.env.CDEK_CLIENT_ID
    delete process.env.CDEK_CLIENT_SECRET
    const { getCityCodeByPostalCode } = await loadClient()

    const result = await getCityCodeByPostalCode('190000')

    expect(result).toBeNull()
  })

  it('успешно возвращает код первого города', async () => {
    setCreds()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(TOKEN_BODY))
      .mockResolvedValueOnce(
        jsonResponse([{ code: 137, city: 'СПб', sub_region: '', region: '', country_code: 'RU', postal_codes: [] }]),
      )
    vi.stubGlobal('fetch', fetchMock)
    const { getCityCodeByPostalCode } = await loadClient()

    const result = await getCityCodeByPostalCode('190000')

    expect(result).toBe(137)
  })

  it('возвращает null при пустом ответе', async () => {
    setCreds()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(TOKEN_BODY))
      .mockResolvedValueOnce(jsonResponse([]))
    vi.stubGlobal('fetch', fetchMock)
    const { getCityCodeByPostalCode } = await loadClient()

    const result = await getCityCodeByPostalCode('190000')

    expect(result).toBeNull()
  })

  it('возвращает null при HTTP-ошибке', async () => {
    setCreds()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(TOKEN_BODY))
      .mockResolvedValueOnce(jsonResponse({}, false, 404))
    vi.stubGlobal('fetch', fetchMock)
    const { getCityCodeByPostalCode } = await loadClient()

    const result = await getCityCodeByPostalCode('190000')

    expect(result).toBeNull()
  })

  it('возвращает null при сетевой ошибке', async () => {
    setCreds()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(TOKEN_BODY))
      .mockRejectedValueOnce(new Error('boom'))
    vi.stubGlobal('fetch', fetchMock)
    const { getCityCodeByPostalCode } = await loadClient()

    const result = await getCityCodeByPostalCode('190000')

    expect(result).toBeNull()
  })
})

describe('getDeliveryPoints', () => {
  it('в CDEK_MOCK_MODE возвращает MOCK_PVZ', async () => {
    process.env.CDEK_MOCK_MODE = 'true'
    const { getDeliveryPoints, MOCK_PVZ } = await loadClient()

    const result = await getDeliveryPoints(44)

    expect(result).toBe(MOCK_PVZ)
  })

  it('возвращает [] если нет токена', async () => {
    delete process.env.CDEK_CLIENT_ID
    delete process.env.CDEK_CLIENT_SECRET
    const { getDeliveryPoints } = await loadClient()

    const result = await getDeliveryPoints(44)

    expect(result).toEqual([])
  })

  it('успешно возвращает список ПВЗ с правильным URL', async () => {
    setCreds()
    const points = [{
      code: 'X1',
      name: 'ПВЗ',
      location: { city: 'Москва', address: 'ул.' },
      work_time: '',
      type: 'PVZ' as const,
      is_handout: true,
    }]
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(TOKEN_BODY))
      .mockResolvedValueOnce(jsonResponse(points))
    vi.stubGlobal('fetch', fetchMock)
    const { getDeliveryPoints } = await loadClient()

    const result = await getDeliveryPoints(44)

    expect(result).toEqual(points)
    const [url] = fetchMock.mock.calls[1] as [string]
    expect(url).toBe('https://api.cdek.ru/v2/deliverypoints?city_code=44&type=PVZ&is_handout=true')
  })

  it('обрезает результат до 300', async () => {
    setCreds()
    const points = Array.from({ length: 320 }, (_, i) => ({
      code: `X${i}`,
      name: 'ПВЗ',
      location: { city: 'Москва', address: 'ул.' },
      work_time: '',
      type: 'PVZ' as const,
      is_handout: true,
    }))
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(TOKEN_BODY))
      .mockResolvedValueOnce(jsonResponse(points))
    vi.stubGlobal('fetch', fetchMock)
    const { getDeliveryPoints } = await loadClient()

    const result = await getDeliveryPoints(44)

    expect(result).toHaveLength(300)
  })

  it('возвращает [] при HTTP-ошибке', async () => {
    setCreds()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(TOKEN_BODY))
      .mockResolvedValueOnce(jsonResponse({}, false, 500))
    vi.stubGlobal('fetch', fetchMock)
    const { getDeliveryPoints } = await loadClient()

    const result = await getDeliveryPoints(44)

    expect(result).toEqual([])
  })

  it('возвращает [] при сетевой ошибке', async () => {
    setCreds()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(TOKEN_BODY))
      .mockRejectedValueOnce(new Error('boom'))
    vi.stubGlobal('fetch', fetchMock)
    const { getDeliveryPoints } = await loadClient()

    const result = await getDeliveryPoints(44)

    expect(result).toEqual([])
  })
})

describe('createCdekOrder', () => {
  const request: CdekOrderRequest = {
    tariff_code: 136,
    from_location: { city: 'Москва' },
    to_location: { city: 'СПб' },
    recipient: { name: 'Иван Иванов', phones: [{ number: '+79990000000' }] },
    packages: [{ number: '1', weight: 500, length: 10, width: 10, height: 10, items: [] }],
  }

  it('возвращает ошибку если нет токена', async () => {
    delete process.env.CDEK_CLIENT_ID
    delete process.env.CDEK_CLIENT_SECRET
    const { createCdekOrder } = await loadClient()

    const result = await createCdekOrder(request)

    expect(result).toEqual({ error: 'Нет токена СДЭК — проверьте CDEK_CLIENT_ID/SECRET' })
  })

  it('успешно создаёт заказ и формирует правильный запрос', async () => {
    setCreds()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(TOKEN_BODY))
      .mockResolvedValueOnce(jsonResponse({ entity: { uuid: 'order-uuid-1', track_number: 'TRACK1' } }))
    vi.stubGlobal('fetch', fetchMock)
    const { createCdekOrder } = await loadClient()

    const result = await createCdekOrder(request)

    expect(result).toEqual({ uuid: 'order-uuid-1', trackNumber: 'TRACK1' })
    const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(url).toBe('https://api.cdek.ru/v2/orders')
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer token-abc' })
    expect(JSON.parse(init.body as string)).toEqual(request)
  })

  it('возвращает ошибку при сетевом сбое fetch', async () => {
    setCreds()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(TOKEN_BODY))
      .mockRejectedValueOnce(new Error('ECONNRESET'))
    vi.stubGlobal('fetch', fetchMock)
    const { createCdekOrder } = await loadClient()

    const result = await createCdekOrder(request)

    expect(result).toEqual({ error: 'Сетевая ошибка СДЭК: Error: ECONNRESET' })
  })

  it('возвращает ошибку если ответ не-JSON', async () => {
    setCreds()
    const badResponse = {
      ok: false,
      status: 502,
      json: () => Promise.reject(new Error('unexpected token')),
      text: () => Promise.resolve('<html>Bad Gateway</html>'),
    } as Response
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(TOKEN_BODY))
      .mockResolvedValueOnce(badResponse)
    vi.stubGlobal('fetch', fetchMock)
    const { createCdekOrder } = await loadClient()

    const result = await createCdekOrder(request)

    expect(result).toEqual({ error: 'СДЭК вернул не-JSON ответ (HTTP 502)' })
  })

  it('собирает сообщение об ошибке из requests[0].errors', async () => {
    setCreds()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(TOKEN_BODY))
      .mockResolvedValueOnce(jsonResponse({
        requests: [{
          state: 'INVALID',
          errors: [{ code: 'E1', message: 'Неверный индекс' }, { code: 'E2', message: 'Неверный телефон' }],
        }],
      }))
    vi.stubGlobal('fetch', fetchMock)
    const { createCdekOrder } = await loadClient()

    const result = await createCdekOrder(request)

    expect(result).toEqual({ error: 'СДЭК API: Неверный индекс; Неверный телефон' })
  })

  it('падает на обобщённое сообщение если entity.uuid и errors отсутствуют', async () => {
    setCreds()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(TOKEN_BODY))
      .mockResolvedValueOnce(jsonResponse({}, false, 400))
    vi.stubGlobal('fetch', fetchMock)
    const { createCdekOrder } = await loadClient()

    const result = await createCdekOrder(request)

    expect(result).toEqual({ error: 'СДЭК API: HTTP 400, нет entity.uuid' })
  })
})

describe('getCdekOrderStatus', () => {
  it('возвращает null если нет токена', async () => {
    delete process.env.CDEK_CLIENT_ID
    delete process.env.CDEK_CLIENT_SECRET
    const { getCdekOrderStatus } = await loadClient()

    const result = await getCdekOrderStatus('uuid-1')

    expect(result).toBeNull()
  })

  it('успешно возвращает entity статуса с правильным URL', async () => {
    setCreds()
    const entity = {
      uuid: 'uuid-1',
      cdek_number: 'CDEK1',
      statuses: [{ code: 'DELIVERED', name: 'Доставлено', date_time: '2026-01-01' }],
    }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(TOKEN_BODY))
      .mockResolvedValueOnce(jsonResponse({ entity }))
    vi.stubGlobal('fetch', fetchMock)
    const { getCdekOrderStatus } = await loadClient()

    const result = await getCdekOrderStatus('uuid-1')

    expect(result).toEqual(entity)
    const [url] = fetchMock.mock.calls[1] as [string]
    expect(url).toBe('https://api.cdek.ru/v2/orders/uuid-1')
  })

  it('возвращает null при HTTP-ошибке', async () => {
    setCreds()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(TOKEN_BODY))
      .mockResolvedValueOnce(jsonResponse({}, false, 404))
    vi.stubGlobal('fetch', fetchMock)
    const { getCdekOrderStatus } = await loadClient()

    const result = await getCdekOrderStatus('uuid-1')

    expect(result).toBeNull()
  })

  it('возвращает null при сетевой ошибке', async () => {
    setCreds()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(TOKEN_BODY))
      .mockRejectedValueOnce(new Error('boom'))
    vi.stubGlobal('fetch', fetchMock)
    const { getCdekOrderStatus } = await loadClient()

    const result = await getCdekOrderStatus('uuid-1')

    expect(result).toBeNull()
  })
})

describe('ensureCdekWebhook', () => {
  const webhookUrl = 'https://example.com/webhooks/cdek'

  it('возвращает false если нет токена', async () => {
    delete process.env.CDEK_CLIENT_ID
    delete process.env.CDEK_CLIENT_SECRET
    const { ensureCdekWebhook } = await loadClient()

    const result = await ensureCdekWebhook(webhookUrl)

    expect(result).toBe(false)
  })

  it('идемпотентен — если вебхук уже зарегистрирован, не создаёт новый', async () => {
    setCreds()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(TOKEN_BODY))
      .mockResolvedValueOnce(jsonResponse([{ uuid: 'wh-1', url: webhookUrl, type: 'ORDER_STATUS' }]))
    vi.stubGlobal('fetch', fetchMock)
    const { ensureCdekWebhook } = await loadClient()

    const result = await ensureCdekWebhook(webhookUrl)

    expect(result).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2) // токен + GET вебхуков, без POST
  })

  it('регистрирует новый вебхук если не найден существующий', async () => {
    setCreds()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(TOKEN_BODY))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({ uuid: 'wh-new' }))
    vi.stubGlobal('fetch', fetchMock)
    const { ensureCdekWebhook } = await loadClient()

    const result = await ensureCdekWebhook(webhookUrl)

    expect(result).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    const [url, init] = fetchMock.mock.calls[2] as [string, RequestInit]
    expect(url).toBe('https://api.cdek.ru/v2/webhooks')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ type: 'ORDER_STATUS', url: webhookUrl })
  })

  it('если запрос списка вебхуков падает — считает список пустым и всё равно пытается создать', async () => {
    setCreds()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(TOKEN_BODY))
      .mockResolvedValueOnce(jsonResponse({}, false, 500))
      .mockResolvedValueOnce(jsonResponse({ uuid: 'wh-new' }))
    vi.stubGlobal('fetch', fetchMock)
    const { ensureCdekWebhook } = await loadClient()

    const result = await ensureCdekWebhook(webhookUrl)

    expect(result).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('возвращает false если создание вебхука вернуло не-ok', async () => {
    setCreds()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(TOKEN_BODY))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({}, false, 400))
    vi.stubGlobal('fetch', fetchMock)
    const { ensureCdekWebhook } = await loadClient()

    const result = await ensureCdekWebhook(webhookUrl)

    expect(result).toBe(false)
  })

  it('возвращает false если создание вебхука бросило сетевую ошибку', async () => {
    setCreds()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(TOKEN_BODY))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockRejectedValueOnce(new Error('boom'))
    vi.stubGlobal('fetch', fetchMock)
    const { ensureCdekWebhook } = await loadClient()

    const result = await ensureCdekWebhook(webhookUrl)

    expect(result).toBe(false)
  })
})
