// CDEK API v2 — TypeScript типы (доменно-нейтральные, общие для всех приложений letar)

export interface CdekTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
}

export interface CdekPackageItem {
  name: string // название товара
  ware_key: string // артикул/идентификатор
  payment: { value: number } // объявленная стоимость (0 если уже оплачено)
  cost: number // стоимость в рублях
  weight: number // вес в граммах
  amount: number // количество штук
}

export interface CdekPackage {
  number: string // уникальный номер места (обязателен при создании заказа)
  weight: number // граммы
  length: number // см
  width: number // см
  height: number // см
  items: CdekPackageItem[] // товары в посылке (обязательно при создании заказа)
  comment?: string
}

/** Габариты посылки для расчёта тарифа (без items) — вес в граммах, размеры в см. */
export interface CdekPackageDims {
  weight: number
  length: number
  width: number
  height: number
}

export interface CdekLocation {
  postal_code?: string
  city?: string
  city_code?: number
  code?: number // city_code в формате calculator/orders
  address?: string
}

export interface CdekTariffListRequest {
  from_location: CdekLocation
  to_location: CdekLocation
  packages: CdekPackageDims[]
}

export interface CdekTariffListItem {
  tariff_code: number
  tariff_name: string
  tariff_description: string
  delivery_mode: number
  delivery_sum: number // рубли (float)
  period_min: number
  period_max: number
  calendar_min: number
  calendar_max: number
}

export interface CdekTariffListResponse {
  tariff_codes: CdekTariffListItem[]
}

export interface CdekCityItem {
  code: number
  city: string
  sub_region: string
  region: string
  country_code: string
  postal_codes: string[]
}

export interface CdekDeliveryPoint {
  code: string
  name: string
  location: {
    city: string
    address: string
    address_full?: string // не всегда присутствует в ответе API
    latitude?: number | null
    longitude?: number | null
    postal_code?: string
  }
  work_time: string
  phones?: Array<{ number: string }>
  type: 'PVZ' | 'POSTAMAT'
  is_handout: boolean
}

export interface CdekOrderRecipient {
  name: string
  phones: Array<{ number: string }>
  email?: string
}

export interface CdekOrderRequest {
  tariff_code: number
  from_location: CdekLocation
  to_location?: CdekLocation // не нужен для CDEK_POINT (достаточно delivery_point)
  delivery_point?: string // pvzCode для CDEK_POINT
  recipient: CdekOrderRecipient
  packages: CdekPackage[]
  comment?: string
  /** Наложенный платёж за доставку — получатель платит эту сумму (руб.) курьеру/на ПВЗ при получении, деньги не проходят через счёт продавца. Не путать с payment.value в CdekPackageItem (это стоимость самого товара). */
  delivery_recipient_cost?: { value: number }
}

export interface CdekOrderError {
  code: string
  message: string
}

export interface CdekOrderResponse {
  entity?: {
    uuid: string
    track_number?: string
  }
  requests?: Array<{
    state: string
    errors?: CdekOrderError[]
  }>
}

export interface CdekOrderStatusResponse {
  entity?: {
    uuid: string
    cdek_number?: string
    statuses?: Array<{
      code: string
      name: string
      date_time: string
    }>
  }
}

// Входящий вебхук трекинга от СДЭК
export interface CdekWebhookPayload {
  type: 'ORDER_STATUS' | 'PRINT_FORM' | 'DOWNLOAD_PHOTO'
  attributes: {
    uuid: string
    im_number?: string // наш orderNumber
    date_time: string
    type: string // код статуса: ACCEPTED, CREATED, SENDED, DELIVERED, etc.
    name: string // читаемое название
    code?: string // трек-номер
    city_name?: string
  }
}

// Результат расчёта для UI (копейки, null = тариф недоступен)
export interface CdekShippingCosts {
  point: number | null // CDEK_POINT (тариф 136), копейки
  door: number | null // CDEK_DOOR (тариф 137), копейки
  periodMin: number | null // минимальный срок, дней
  periodMax: number | null // максимальный срок, дней
  error?: string
}

/** Подсказка города от DaData (UI prefix-поиск перед резолвом в CDEK city_code). */
export interface DadataCitySuggestion {
  city: string
  region: string
}

/** Результат загрузки ПВЗ для UI. */
export interface DeliveryPointsResult {
  points: CdekDeliveryPoint[]
  error?: string
}
