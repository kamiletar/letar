// Web MIDI: устройство-агностичный ввод (SMK-37 + любой class-compliant)

export interface MidiDevice {
  id: string
  name: string
  manufacturer: string
}

export interface MidiCallbacks {
  onNoteOn: (midiNote: number, velocity: number) => void
  onNoteOff: (midiNote: number) => void
  onCC: (cc: number, value: number) => void
  /** Входящий SysEx (например, ответ на запрос дампа патча) — полный фрейм F0...F7 */
  onSysex?: (bytes: Uint8Array) => void
  /**
   * Крутилка-энкодер повёрнута. index — номер энкодера (0-7). value — АБСОЛЮТНАЯ позиция 0-127
   * (несмотря на «бесконечное» вращение самого энкодера, устройство шлёт именно абсолютное
   * значение, не относительный шаг — подтверждено на железе 2026-07-09: значения идут гладкой
   * последовательностью 0..127 туда-обратно, а не «тиками»). bank — какой физический банк
   * энкодеров сейчас активен (кнопка knob bank на устройстве), разные банки управляют разными
   * наборами параметров — см. midi-mapping.ts:
   * - банк 1 — Control Change на фиксированном канале, номер CC = 48+index (48-55)
   * - банк 2 — Pitch Bend, номер канала = index
   * (номер энкодера кодируется по-разному в двух банках — так шлёт железо, не наша прихоть)
   */
  onEncoder?: (index: number, value: number, bank: 1 | 2) => void
  /**
   * Каждое входящее MIDI-сообщение целиком, до какой-либо интерпретации — для диагностики
   * недокументированных кнопок устройства (ARP/SCALE/CHORD/GLOBE/BT/PATCH/PARA/FX/SEQ и т.п.):
   * SysEx-карта SMK-37 PRO эти кнопки не описывает, неизвестно, шлют ли они вообще MIDI на хост
   * или это чисто меню внутренней прошивки. См. MidiMonitor.
   */
  onRawMessage?: (bytes: Uint8Array) => void
}

// SMK-37 PRO touch-энкодеры при касании шлют Note On/Off как индикатор «палец на ручке»
// (не музыкальную ноту) — на канале 0, ноты 104-111 (по одной на каждый из 8 энкодеров).
// Без этого фильтра простое касание крутилки играет случайную высокую ноту в текущем движке.
const ENCODER_TOUCH_NOTE_MIN = 104
const ENCODER_TOUCH_NOTE_MAX = 111

// Банк 1 энкодеров: фиксированный канал (5), но РАЗНЫЙ CC-номер на каждую из 8 крутилок (48-55) —
// подтверждено на железе 2026-07-09. Первая попытка (номер CC фиксирован, канал = индекс
// энкодера) была перепутана местами — оттого крутилась только одна ручка из восьми.
const ENCODER_BANK1_CC_MIN = 0x30
const ENCODER_BANK1_CC_MAX = 0x37

export class MidiInputManager {
  private access: MIDIAccess | null = null
  private callbacks: MidiCallbacks
  private octaveShift = 0 // в полутонах (±12 = ±1 октава, диапазон ±24)

  constructor(callbacks: MidiCallbacks) {
    this.callbacks = callbacks
  }

  async connect(): Promise<MidiDevice[]> {
    if (!('requestMIDIAccess' in navigator)) {
      throw new Error('Web MIDI не поддерживается. Используй Chrome или Edge.')
    }

    this.access = await navigator.requestMIDIAccess({ sysex: true })
    this._attachListeners()
    // Переподключить слушателей при изменении устройств (включение/выключение)
    this.access.onstatechange = () => this._attachListeners()
    return this.getDevices()
  }

  getDevices(): MidiDevice[] {
    if (!this.access) {
      return []
    }
    return Array.from(this.access.inputs.values()).map((inp) => ({
      id: inp.id,
      name: inp.name ?? 'MIDI-устройство',
      manufacturer: inp.manufacturer ?? '',
    }))
  }

  getOutputs(): MidiDevice[] {
    if (!this.access) {
      return []
    }
    return Array.from(this.access.outputs.values()).map((out) => ({
      id: out.id,
      name: out.name ?? 'MIDI-устройство',
      manufacturer: out.manufacturer ?? '',
    }))
  }

  /** Отправляет сырые байты (например, SysEx-патч) на первый доступный MIDI-выход */
  send(bytes: Uint8Array): void {
    if (!this.access) {
      throw new Error('MIDI не подключён')
    }
    const output = this.access.outputs.values().next().value
    if (!output) {
      throw new Error('Нет доступного MIDI-выхода — устройство подключено только как вход?')
    }
    output.send(bytes)
  }

  shiftOctave(delta: number): void {
    this.octaveShift = Math.max(-24, Math.min(24, this.octaveShift + delta))
  }

  getOctaveShift(): number {
    return this.octaveShift
  }

  private _attachListeners(): void {
    if (!this.access) {
      return
    }
    for (const input of this.access.inputs.values()) {
      input.onmidimessage = (evt) => this._onMessage(evt)
    }
  }

  private _onMessage(evt: MIDIMessageEvent): void {
    const { data } = evt
    if (!data || data.length < 2) {
      return
    }

    this.callbacks.onRawMessage?.(new Uint8Array(data))

    const status = data[0]

    if (status === 0xf0) {
      // SysEx-фрейм (Web MIDI отдаёт его целиком одним событием) — ответ на дамп-запрос и т.п.
      this.callbacks.onSysex?.(new Uint8Array(data))
      return
    }

    const d1 = data[1]
    const d2 = data.length > 2 ? data[2] : 0
    const type = status & 0xf0

    if (type === 0x90 && d2 > 0) {
      // Note On — фильтруем touch-индикаторы энкодеров (см. ENCODER_TOUCH_NOTE_*)
      if (d1 >= ENCODER_TOUCH_NOTE_MIN && d1 <= ENCODER_TOUCH_NOTE_MAX) {
        return
      }
      const note = Math.max(0, Math.min(127, d1 + this.octaveShift))
      this.callbacks.onNoteOn(note, d2 / 127)
    } else if (type === 0x80 || (type === 0x90 && d2 === 0)) {
      // Note Off (или Note On с velocity=0 — стандартный трюк)
      if (d1 >= ENCODER_TOUCH_NOTE_MIN && d1 <= ENCODER_TOUCH_NOTE_MAX) {
        return
      }
      const note = Math.max(0, Math.min(127, d1 + this.octaveShift))
      this.callbacks.onNoteOff(note)
    } else if (type === 0xb0) {
      if (d1 >= ENCODER_BANK1_CC_MIN && d1 <= ENCODER_BANK1_CC_MAX) {
        // Энкодер, банк 1 — CC 48-55 на фиксированном канале, номер CC = номеру энкодера
        const encoderIndex = d1 - ENCODER_BANK1_CC_MIN
        this.callbacks.onEncoder?.(encoderIndex, d2, 1)
      } else {
        // Control Change — физические фейдеры SMK-37 (CC 64-71, два банка по 4, см. midi-mapping.ts)
        this.callbacks.onCC(d1, d2)
      }
    } else if (type === 0xe0) {
      // Энкодер, банк 2 — Pitch Bend на канале = номеру энкодера.
      // d1 (LSB) всегда 0 на этом устройстве, абсолютная позиция 0-127 — в d2 (MSB).
      const encoderIndex = status & 0x0f
      this.callbacks.onEncoder?.(encoderIndex, d2, 2)
    }
    // Aftertouch (0xD0) и т.д. — Фаза 1.5, если понадобится
  }

  dispose(): void {
    if (this.access) {
      for (const inp of this.access.inputs.values()) {
        inp.onmidimessage = null
      }
      this.access.onstatechange = null
    }
    this.access = null
  }
}
