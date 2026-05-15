/**
 * Получение информации об оборудовании
 *
 * GPU — через nvidia-smi (модель, compute capability, поколение)
 * CPU — через os.cpus()
 */

import { exec } from 'child_process'
import * as os from 'os'
import { promisify } from 'util'

const execAsync = promisify(exec)

// === Типы ===

/** Поколение GPU NVIDIA */
export type GpuGeneration = 'blackwell' | 'ada' | 'ampere' | 'turing' | 'none'

/** Возможности GPU для кодирования */
export interface GpuCapability {
  /** Модель GPU (например "NVIDIA GeForce RTX 5080") */
  model: string | null
  /** Поколение архитектуры */
  generation: GpuGeneration
  /** Поддержка AV1 кодирования (Ada+) */
  supportsAv1: boolean
  /** Поддержка UHQ tune (Ada+) */
  supportsUhqTune: boolean
  /** Поддержка Temporal Filter (Blackwell) */
  supportsTemporalFilter: boolean
}

// === Кэши ===

/** Кэш для модели GPU */
let cachedGpuModel: string | null = null

/** Кэш для модели CPU */
let cachedCpuModel: string | null = null

/** Кэш для возможностей GPU */
let cachedGpuCapability: GpuCapability | null = null

// === Определение поколения GPU ===

/**
 * Определить поколение GPU по compute capability
 *
 * Turing: 7.5, Ampere: 8.0-8.6, Ada: 8.9, Blackwell: 10.0+
 */
function generationFromComputeCap(cc: number): GpuGeneration {
  if (cc >= 10.0) {
    return 'blackwell'
  }
  if (cc >= 8.9) {
    return 'ada'
  }
  if (cc >= 8.0) {
    return 'ampere'
  }
  if (cc >= 7.0) {
    return 'turing'
  }
  return 'none'
}

/**
 * Определить поколение GPU по названию (фолбэк если compute cap недоступен)
 *
 * RTX 50xx → Blackwell, RTX 40xx → Ada, RTX 30xx → Ampere, RTX 20xx/GTX 16xx → Turing
 */
function generationFromName(name: string): GpuGeneration {
  const upper = name.toUpperCase()

  // Blackwell: RTX 5090, 5080, 5070, 5060 и т.д.
  if (/RTX\s*50\d{2}/i.test(upper)) {
    return 'blackwell'
  }
  // Ada Lovelace: RTX 4090, 4080, 4070, 4060 и т.д.
  if (/RTX\s*40\d{2}/i.test(upper)) {
    return 'ada'
  }
  // Ampere: RTX 3090, 3080, 3070, 3060 и т.д.
  if (/RTX\s*30\d{2}/i.test(upper)) {
    return 'ampere'
  }
  // Turing: RTX 2080, 2070, 2060 или GTX 1660, 1650
  if (/RTX\s*20\d{2}/i.test(upper) || /GTX\s*16\d{2}/i.test(upper)) {
    return 'turing'
  }

  // Профессиональные карты
  if (/RTX\s*6000\s*Ada/i.test(upper) || /RTX\s*5880/i.test(upper)) {
    return 'ada'
  }
  if (/RTX\s*A\d{4}/i.test(upper)) {
    return 'ampere'
  }

  return 'none'
}

/**
 * Построить объект возможностей на основе поколения
 */
function capabilityFromGeneration(model: string | null, generation: GpuGeneration): GpuCapability {
  return {
    model,
    generation,
    supportsAv1: generation === 'ada' || generation === 'blackwell',
    supportsUhqTune: generation === 'ada' || generation === 'blackwell',
    supportsTemporalFilter: generation === 'blackwell',
  }
}

// === Публичные функции ===

/**
 * Получить модель GPU через nvidia-smi
 * Кэшируется после первого вызова
 */
export async function getGpuModel(): Promise<string | null> {
  if (cachedGpuModel !== null) {
    return cachedGpuModel || null
  }

  try {
    const { stdout } = await execAsync('nvidia-smi --query-gpu=name --format=csv,noheader,nounits')
    const gpuName = stdout.trim().split('\n')[0]?.trim()
    if (gpuName) {
      cachedGpuModel = gpuName
      return cachedGpuModel
    }
    cachedGpuModel = ''
    return null
  } catch {
    cachedGpuModel = ''
    return null
  }
}

/**
 * Получить возможности GPU (поколение, поддержка кодеков)
 *
 * Определяет по compute capability (приоритет) и имени GPU (фолбэк).
 * Кэшируется после первого вызова.
 */
export async function getGpuCapability(): Promise<GpuCapability> {
  if (cachedGpuCapability) {
    return cachedGpuCapability
  }

  try {
    const { stdout } = await execAsync('nvidia-smi --query-gpu=name,compute_cap --format=csv,noheader,nounits')
    const line = stdout.trim().split('\n')[0]?.trim()
    if (!line) {
      cachedGpuCapability = capabilityFromGeneration(null, 'none')
      return cachedGpuCapability
    }

    // Формат: "NVIDIA GeForce RTX 5080, 10.0"
    const parts = line.split(',').map((s) => s.trim())
    const gpuName = parts[0] || null
    const computeCapStr = parts[1]

    // Сохраняем модель в кэш для совместимости с getGpuModel()
    cachedGpuModel = gpuName ?? ''

    let generation: GpuGeneration = 'none'

    // Приоритет: compute capability
    if (computeCapStr) {
      const cc = Number.parseFloat(computeCapStr)
      if (!Number.isNaN(cc)) {
        generation = generationFromComputeCap(cc)
      }
    }

    // Фолбэк: по имени GPU
    if (generation === 'none' && gpuName) {
      generation = generationFromName(gpuName)
    }

    cachedGpuCapability = capabilityFromGeneration(gpuName, generation)
    return cachedGpuCapability
  } catch {
    cachedGpuModel = cachedGpuModel ?? ''
    cachedGpuCapability = capabilityFromGeneration(null, 'none')
    return cachedGpuCapability
  }
}

/**
 * Получить модель CPU
 * Кэшируется после первого вызова
 */
export function getCpuModel(): string {
  if (cachedCpuModel) {
    return cachedCpuModel
  }

  const cpus = os.cpus()
  if (cpus.length > 0) {
    // Убираем лишние пробелы и частоту (@ X.XXGHz)
    cachedCpuModel = cpus[0].model.replace(/\s+/g, ' ').trim()
    return cachedCpuModel
  }

  cachedCpuModel = 'Unknown CPU'
  return cachedCpuModel
}

/**
 * Получить модель оборудования по типу энкодера
 */
export async function getHardwareModel(encoderType: 'gpu' | 'cpu'): Promise<string> {
  if (encoderType === 'gpu') {
    const gpuModel = await getGpuModel()
    return gpuModel ?? 'Unknown GPU'
  }
  return getCpuModel()
}
