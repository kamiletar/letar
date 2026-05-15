'use server'

import type { Gender } from '@/generated/prisma'
import {
  findSizeByCode as findSizeByCodeUtil,
  findSizeByMeasurements as findSizeByMeasurementsUtil,
  type SizeInfo,
  type SizeMatch,
  type SizeSystem,
} from '../_lib/size-utils'

/**
 * Find size by code in any system
 * Server action wrapper for client components
 */
export async function findSizeByCode(code: string, system: SizeSystem, gender?: Gender): Promise<SizeInfo[]> {
  return findSizeByCodeUtil(code, system, gender)
}

/**
 * Find size by body measurements with smart matching
 * Server action wrapper for client components
 */
export async function findSizeByMeasurements(
  bust: number,
  waist: number,
  hips: number,
  gender: Gender
): Promise<SizeMatch[]> {
  return findSizeByMeasurementsUtil(bust, waist, hips, gender)
}
