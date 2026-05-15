// CDEK API v2 — TypeScript типы

export interface CdekTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
}

export interface CdekPackage {
  weight: number // граммы
  length: number // см
  width: number // см
  height: number // см
  number?: string
  comment?: string
}

export interface CdekLocation {
  postal_code?: string
  city?: string
  city_code?: number
  address?: string
}

export interface CdekTariffListRequest {
  from_location: CdekLocation
  to_location: CdekLocation
  packages: CdekPackage[]
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
  to_location: CdekLocation
  delivery_point?: string // pvzCode для CDEK_POINT
  recipient: CdekOrderRecipient
  packages: CdekPackage[]
  comment?: string
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
