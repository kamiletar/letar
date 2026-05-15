/**
 * Определения встроенных профилей кодирования по поколениям GPU
 *
 * Используется в main process (seed при старте) и renderer (reset профиля).
 */

import type { GpuGeneration } from './types'

/** Тип для определения встроенного профиля */
export interface BuiltInProfile {
  name: string
  isBuiltIn: true
  isDefault: boolean
  codec: 'AV1' | 'HEVC' | 'H264'
  useGpu: boolean
  preferCpu: boolean
  rateControl: 'VBR' | 'CONSTQP' | 'CQ'
  cq: number
  preset: string
  tune: 'NONE' | 'HQ' | 'UHQ' | 'ULL' | 'LL'
  multipass: 'DISABLED' | 'QRES' | 'FULLRES'
  spatialAq: boolean
  temporalAq: boolean
  aqStrength: number
  lookahead?: number
  lookaheadLevel?: number
  gopSize: number
  bRefMode: 'DISABLED' | 'EACH' | 'MIDDLE'
  force10Bit: boolean
  temporalFilter: boolean
  deband: boolean
}

// === Общие базы для профилей ===

/** Базовые поля для всех профилей */
const BASE = {
  isBuiltIn: true as const,
  preferCpu: false,
  spatialAq: true,
  temporalAq: true,
  aqStrength: 8,
  gopSize: 240,
  deband: true,
  force10Bit: false,
  temporalFilter: false,
}

/** Поля для качественного GPU профиля (multipass + lookahead) */
const GPU_HQ = {
  multipass: 'FULLRES' as const,
  lookahead: 250,
  lookaheadLevel: 3,
  bRefMode: 'MIDDLE' as const,
}

// === Профили по поколениям GPU ===

/** Blackwell (RTX 50xx) — полный набор с UHQ и Temporal Filter */
function blackwellProfiles(): BuiltInProfile[] {
  return [
    {
      ...BASE,
      name: 'Быстрый',
      isDefault: false,
      codec: 'AV1',
      useGpu: true,
      rateControl: 'VBR',
      cq: 32,
      preset: 'p1',
      tune: 'NONE',
      multipass: 'DISABLED',
      bRefMode: 'DISABLED',
    },
    {
      ...BASE,
      name: 'Баланс',
      isDefault: false,
      codec: 'AV1',
      useGpu: true,
      rateControl: 'VBR',
      cq: 28,
      preset: 'p5',
      tune: 'HQ',
      multipass: 'DISABLED',
      bRefMode: 'DISABLED',
    },
    {
      ...BASE,
      name: 'Качество',
      isDefault: false,
      codec: 'AV1',
      useGpu: true,
      rateControl: 'VBR',
      cq: 24,
      preset: 'p7',
      tune: 'HQ',
      ...GPU_HQ,
    },
    {
      ...BASE,
      name: 'Blackwell UHQ',
      isDefault: true,
      codec: 'AV1',
      useGpu: true,
      rateControl: 'VBR',
      cq: 24,
      preset: 'p7',
      tune: 'UHQ',
      ...GPU_HQ,
      force10Bit: true,
      temporalFilter: true,
    },
    {
      ...BASE,
      name: 'Архив',
      isDefault: false,
      codec: 'AV1',
      useGpu: true,
      rateControl: 'VBR',
      cq: 20,
      preset: 'p7',
      tune: 'UHQ',
      ...GPU_HQ,
      force10Bit: true,
      temporalFilter: true,
    },
  ]
}

/** Ada (RTX 40xx) — AV1 NVENC, без Temporal Filter и UHQ */
function adaProfiles(): BuiltInProfile[] {
  return [
    {
      ...BASE,
      name: 'Быстрый',
      isDefault: false,
      codec: 'AV1',
      useGpu: true,
      rateControl: 'VBR',
      cq: 32,
      preset: 'p1',
      tune: 'NONE',
      multipass: 'DISABLED',
      bRefMode: 'DISABLED',
    },
    {
      ...BASE,
      name: 'Баланс',
      isDefault: false,
      codec: 'AV1',
      useGpu: true,
      rateControl: 'VBR',
      cq: 28,
      preset: 'p5',
      tune: 'HQ',
      multipass: 'DISABLED',
      bRefMode: 'DISABLED',
    },
    {
      ...BASE,
      name: 'Качество',
      isDefault: true,
      codec: 'AV1',
      useGpu: true,
      rateControl: 'VBR',
      cq: 24,
      preset: 'p7',
      tune: 'HQ',
      ...GPU_HQ,
    },
    {
      ...BASE,
      name: 'Архив',
      isDefault: false,
      codec: 'AV1',
      useGpu: true,
      rateControl: 'VBR',
      cq: 20,
      preset: 'p7',
      tune: 'HQ',
      ...GPU_HQ,
      force10Bit: true,
    },
  ]
}

/** Turing/Ampere (RTX 20/30xx) — HEVC NVENC, без AV1 */
function legacyGpuProfiles(): BuiltInProfile[] {
  return [
    {
      ...BASE,
      name: 'Быстрый',
      isDefault: false,
      codec: 'HEVC',
      useGpu: true,
      rateControl: 'VBR',
      cq: 28,
      preset: 'p1',
      tune: 'NONE',
      multipass: 'DISABLED',
      bRefMode: 'DISABLED',
    },
    {
      ...BASE,
      name: 'Баланс',
      isDefault: false,
      codec: 'HEVC',
      useGpu: true,
      rateControl: 'VBR',
      cq: 24,
      preset: 'p5',
      tune: 'HQ',
      multipass: 'DISABLED',
      bRefMode: 'DISABLED',
    },
    {
      ...BASE,
      name: 'Качество',
      isDefault: true,
      codec: 'HEVC',
      useGpu: true,
      rateControl: 'VBR',
      cq: 22,
      preset: 'p7',
      tune: 'HQ',
      ...GPU_HQ,
    },
  ]
}

/** Нет GPU — CPU кодирование через SVT-AV1 */
function cpuProfiles(): BuiltInProfile[] {
  return [
    {
      ...BASE,
      name: 'Быстрый',
      isDefault: false,
      codec: 'AV1',
      useGpu: false,
      preferCpu: true,
      rateControl: 'VBR',
      cq: 32,
      preset: '10',
      tune: 'NONE',
      multipass: 'DISABLED',
      spatialAq: false,
      temporalAq: false,
      bRefMode: 'DISABLED',
    },
    {
      ...BASE,
      name: 'Баланс',
      isDefault: false,
      codec: 'AV1',
      useGpu: false,
      preferCpu: true,
      rateControl: 'VBR',
      cq: 28,
      preset: '6',
      tune: 'NONE',
      multipass: 'DISABLED',
      spatialAq: false,
      temporalAq: false,
      bRefMode: 'DISABLED',
    },
    {
      ...BASE,
      name: 'Качество',
      isDefault: true,
      codec: 'AV1',
      useGpu: false,
      preferCpu: true,
      rateControl: 'VBR',
      cq: 24,
      preset: '4',
      tune: 'NONE',
      multipass: 'DISABLED',
      spatialAq: false,
      temporalAq: false,
      bRefMode: 'DISABLED',
    },
  ]
}

/**
 * Получить набор встроенных профилей для конкретного поколения GPU
 */
export function getBuiltInProfiles(generation: GpuGeneration): BuiltInProfile[] {
  switch (generation) {
    case 'blackwell':
      return blackwellProfiles()
    case 'ada':
      return adaProfiles()
    case 'ampere':
    case 'turing':
      return legacyGpuProfiles()
    case 'none':
      return cpuProfiles()
  }
}
