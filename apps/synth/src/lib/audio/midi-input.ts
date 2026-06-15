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
}

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
    if (!this.access) {return []}
    return Array.from(this.access.inputs.values()).map((inp) => ({
      id: inp.id,
      name: inp.name ?? 'MIDI-устройство',
      manufacturer: inp.manufacturer ?? '',
    }))
  }

  shiftOctave(delta: number): void {
    this.octaveShift = Math.max(-24, Math.min(24, this.octaveShift + delta))
  }

  getOctaveShift(): number {
    return this.octaveShift
  }

  private _attachListeners(): void {
    if (!this.access) {return}
    for (const input of this.access.inputs.values()) {
      input.onmidimessage = (evt) => this._onMessage(evt)
    }
  }

  private _onMessage(evt: MIDIMessageEvent): void {
    const { data } = evt
    if (!data || data.length < 2) {return}

    const status = data[0]
    const d1 = data[1]
    const d2 = data.length > 2 ? data[2] : 0
    const type = status & 0xf0

    if (type === 0x90 && d2 > 0) {
      // Note On
      const note = Math.max(0, Math.min(127, d1 + this.octaveShift))
      this.callbacks.onNoteOn(note, d2 / 127)
    } else if (type === 0x80 || (type === 0x90 && d2 === 0)) {
      // Note Off (или Note On с velocity=0 — стандартный трюк)
      const note = Math.max(0, Math.min(127, d1 + this.octaveShift))
      this.callbacks.onNoteOff(note)
    } else if (type === 0xb0) {
      // Control Change
      this.callbacks.onCC(d1, d2)
    }
    // Остальные статусы (Pitch Bend 0xE0, Aftertouch 0xD0 и т.д.) — Фаза 1.5
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
