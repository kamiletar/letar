/**
 * Хелпер для парсинга metadata JSON в модели Organization
 *
 * В Better Auth модели Organization поля cities и licenseCategories
 * хранятся в JSON поле metadata.
 *
 * @module organization-metadata
 */

import type { LicenseCategory } from '@letar/driving-school-db/prisma'

/** Интерфейс для metadata Organization */
export interface OrganizationMetadata {
  cities: string[]
  licenseCategories: LicenseCategory[]
}

/**
 * Парсит metadata JSON из модели Organization
 *
 * @param metadata - JSON строка или null
 * @returns Объект с cities и licenseCategories
 */
export function parseOrganizationMetadata(metadata: string | null): OrganizationMetadata {
  if (!metadata) {
    return { cities: [], licenseCategories: [] }
  }

  try {
    const parsed = JSON.parse(metadata)
    return {
      cities: Array.isArray(parsed.cities) ? parsed.cities : [],
      licenseCategories: Array.isArray(parsed.licenseCategories) ? parsed.licenseCategories : [],
    }
  } catch {
    return { cities: [], licenseCategories: [] }
  }
}

/**
 * Сериализует metadata для сохранения в Organization
 *
 * @param metadata - Объект с cities и licenseCategories
 * @returns JSON строка
 */
export function serializeOrganizationMetadata(metadata: OrganizationMetadata): string {
  return JSON.stringify(metadata)
}
