'use client'

import { FieldSegmentedGroup, type SegmentedGroupOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { cpuPresetLabels, presetLabels, x26xPresetLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  /** GPU или CPU кодирование (по умолчанию GPU) */
  useGpu?: boolean
  /** Кодек (влияет на CPU пресеты: AV1 = числа, HEVC/H264 = имена) */
  codec?: string
}

/** GPU пресеты NVENC (p1-p7) */
const gpuPresets = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'] as const

/** CPU пресеты SVT-AV1 (числовые, меньше = качественнее) */
const cpuAv1Presets = ['10', '8', '6', '4'] as const

/** CPU пресеты libx265/libx264 (именованные) */
const cpuX26xPresets = ['veryfast', 'faster', 'medium', 'slow'] as const

/**
 * Segmented control для выбора пресета кодирования
 *
 * Автоматически переключает опции между GPU (NVENC p1-p7)
 * и CPU (SVT-AV1 числа / libx265 имена) в зависимости от useGpu и codec.
 */
export function SegmentedPreset({ name, useGpu = true, codec = 'AV1', ...props }: Props): ReactElement {
  let options: SegmentedGroupOption<string>[]

  if (useGpu) {
    // GPU: NVENC пресеты p1-p7
    options = gpuPresets.map((value) => ({
      label: presetLabels[value] ?? value.toUpperCase(),
      value,
    }))
  } else if (codec === 'AV1') {
    // CPU: SVT-AV1 числовые пресеты
    options = cpuAv1Presets.map((value) => ({
      label: cpuPresetLabels[value] ?? value,
      value,
    }))
  } else {
    // CPU: libx265/libx264 именованные пресеты
    options = cpuX26xPresets.map((value) => ({
      label: x26xPresetLabels[value] ?? value,
      value,
    }))
  }

  return <FieldSegmentedGroup name={name} options={options} colorPalette="purple" {...props} />
}
