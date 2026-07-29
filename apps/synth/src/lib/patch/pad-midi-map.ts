// Маппинг «MIDI-нота → индекс пэда драм-кита» с поддержкой MIDI Learn.
//
// SMK-37 PRO (как и большинство контроллеров) не имеет фиксированной note/CC-карты для 16 пэдов —
// раскладка настраивается в MidiSuite и хранится в одном из 4 пресетов на самом устройстве
// (заводской дефолт: пэды на канале 10, нота 36 = первый пэд — стандарт GM). Чтобы не завязываться
// на конкретный пресет прошивки, храним переопределяемую карту в localStorage: один раз «выучил»
// физический пэд — работает даже если владелец потом переключит пресет на железе.

import { loadLocalStorageString, saveLocalStorageString } from './local-storage-string'

const STORAGE_KEY = 'synth:pad-midi-map'
const PAD_COUNT = 16
export const DEFAULT_PAD_MIDI_BASE = 36 // GM-стандарт: нота 36 = первый пэд (канал 10)

/** MIDI-нота → индекс пэда (0-15) */
export type PadMidiMap = Record<number, number>

export function defaultPadMidiMap(): PadMidiMap {
  const map: PadMidiMap = {}
  for (let i = 0; i < PAD_COUNT; i++) {
    map[DEFAULT_PAD_MIDI_BASE + i] = i
  }
  return map
}

export function loadPadMidiMap(): PadMidiMap {
  const raw = loadLocalStorageString(STORAGE_KEY)
  if (!raw) {
    return defaultPadMidiMap()
  }
  try {
    return JSON.parse(raw) as PadMidiMap
  } catch {
    return defaultPadMidiMap()
  }
}

export function savePadMidiMap(map: PadMidiMap): void {
  saveLocalStorageString(STORAGE_KEY, JSON.stringify(map))
}

/** Назначает ноту пэду — снимает эту ноту с пэда, за которым она была закреплена раньше */
export function learnPadNote(map: PadMidiMap, padIndex: number, note: number): PadMidiMap {
  const next: PadMidiMap = {}
  for (const [n, idx] of Object.entries(map)) {
    if (idx !== padIndex) {
      next[Number(n)] = idx
    }
  }
  next[note] = padIndex
  return next
}

export function resolvePad(map: PadMidiMap, note: number): number | null {
  return map[note] ?? null
}
