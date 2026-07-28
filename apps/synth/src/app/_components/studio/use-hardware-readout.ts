'use client'

import { useCallback, useState } from 'react'

// Живой «слепок» состояния физических фейдеров/энкодеров SMK-37 — только для отображения
// в HardwarePanel, не источник истины для звука (тем занимается midi-mapping.ts).
export interface HardwareReadout {
  faderValues: readonly [number, number, number, number] // 0-127, последнее значение по каждому физическому слоту
  faderBank: 1 | 2 // какой банк фейдеров использовался последним (см. midi-input.ts)
  encoderValues: readonly number[] // 0-127 × 8, последнее значение по каждому физическому энкодеру
  encoderBank: 1 | 2 // какой банк энкодеров использовался последним
  recordCC: (cc: number, value: number) => void
  recordEncoder: (index: number, value: number, bank: 1 | 2) => void
}

const FADER_BANK1_CC_MIN = 64
const FADER_BANK2_CC_MIN = 68

export function useHardwareReadout(): HardwareReadout {
  const [faderValues, setFaderValues] = useState<[number, number, number, number]>([0, 0, 0, 0])
  const [faderBank, setFaderBank] = useState<1 | 2>(1)
  const [encoderValues, setEncoderValues] = useState<number[]>(() => new Array(8).fill(0))
  const [encoderBank, setEncoderBank] = useState<1 | 2>(1)

  const recordCC = useCallback((cc: number, value: number) => {
    if (cc >= FADER_BANK1_CC_MIN && cc < FADER_BANK1_CC_MIN + 4) {
      setFaderBank(1)
      setFaderValues((prev) => {
        const next = [...prev] as [number, number, number, number]
        next[cc - FADER_BANK1_CC_MIN] = value
        return next
      })
    } else if (cc >= FADER_BANK2_CC_MIN && cc < FADER_BANK2_CC_MIN + 4) {
      setFaderBank(2)
      setFaderValues((prev) => {
        const next = [...prev] as [number, number, number, number]
        next[cc - FADER_BANK2_CC_MIN] = value
        return next
      })
    }
  }, [])

  const recordEncoder = useCallback((index: number, value: number, bank: 1 | 2) => {
    if (index < 0 || index > 7) {
      return
    }
    setEncoderBank(bank)
    setEncoderValues((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }, [])

  return { faderValues, faderBank, encoderValues, encoderBank, recordCC, recordEncoder }
}
