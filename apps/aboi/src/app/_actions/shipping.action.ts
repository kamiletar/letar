'use server'

import {
  calculateShippingCosts,
  getCityCodeByPostalCode,
  getDeliveryPoints,
  searchCdekCities,
} from '@/lib/shipping/cdek'
import type { CdekCityItem, CdekDeliveryPoint, CdekShippingCosts } from '@/lib/shipping/cdek-types'
import { z } from 'zod/v4'

export interface ShippingCostResult {
  ok: boolean
  point: number | null // копейки
  door: number | null // копейки
  periodMin: number | null
  periodMax: number | null
  /** true = CDEK API недоступен, показывать только MANAGER_CALL */
  fallback: boolean
  error?: string
}

const CalcSchema = z
  .object({
    postalCode: z.string().min(4).max(12),
    totalMeters: z.number().positive(),
  })
  .strip()

export async function calculateShippingCostAction(raw: unknown): Promise<ShippingCostResult> {
  const parsed = CalcSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, point: null, door: null, periodMin: null, periodMax: null, fallback: true }
  }

  const result: CdekShippingCosts = await calculateShippingCosts(parsed.data.postalCode, parsed.data.totalMeters)

  const fallback = result.point === null && result.door === null

  return {
    ok: true,
    point: result.point,
    door: result.door,
    periodMin: result.periodMin,
    periodMax: result.periodMax,
    fallback,
    error: result.error,
  }
}

export interface DeliveryPointsResult {
  points: CdekDeliveryPoint[]
  error?: string
}

export async function getDeliveryPointsAction(postalCode: string): Promise<DeliveryPointsResult> {
  if (!postalCode || postalCode.length < 4) {
    return { points: [], error: 'Некорректный индекс' }
  }

  const cityCode = await getCityCodeByPostalCode(postalCode)
  if (!cityCode) {
    return { points: [], error: 'Город не найден в базе СДЭК' }
  }

  const points = await getDeliveryPoints(cityCode)
  return { points }
}

/** Загрузить ПВЗ напрямую по CDEK city_code (без поиска по индексу). */
export async function getDeliveryPointsByCityCodeAction(cityCode: number): Promise<DeliveryPointsResult> {
  const points = await getDeliveryPoints(cityCode)
  if (points.length === 0) {
    return { points: [], error: 'ПВЗ не найдены — выберите доставку курьером' }
  }
  return { points }
}

/** Поиск городов СДЭК по названию (для автодополнения). */
export async function searchCdekCitiesAction(query: string): Promise<CdekCityItem[]> {
  if (!query || query.length < 2) return []
  return searchCdekCities(query)
}

interface NominatimAddress {
  city?: string
  town?: string
  village?: string
  municipality?: string
  county?: string
}

interface NominatimResponse {
  address?: NominatimAddress
  error?: string
}

/**
 * Определяет город по координатам через Nominatim (OSM), затем ищет в базе СДЭК.
 * Возвращает первый подходящий город или null.
 */
export async function getCityByCoordinatesAction(lat: number, lng: number): Promise<CdekCityItem | null> {
  try {
    // Reverse geocoding через Nominatim (бесплатно, без ключа)
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ru`
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'aboi-wallpaper-shop/1.0 (kamimidori25@gmail.com)' },
      signal: AbortSignal.timeout(6_000),
    })
    if (!resp.ok) return null

    const data = (await resp.json()) as NominatimResponse
    if (data.error) return null

    // Берём наиболее подходящий населённый пункт
    const cityName = data.address?.city
      ?? data.address?.town
      ?? data.address?.village
      ?? data.address?.municipality
      ?? data.address?.county

    if (!cityName) return null

    // Ищем в базе СДЭК
    const cities = await searchCdekCities(cityName)
    return cities[0] ?? null
  } catch {
    return null
  }
}
