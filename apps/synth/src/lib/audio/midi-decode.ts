// Человекочитаемая расшифровка сырого MIDI-сообщения — для диагностики недокументированных
// кнопок устройства (ARP/NOTE REPEAT/SCALE/CHORD/GLOBE/BT/PATCH/PARA/FX/SEQ и т.п.): community
// SysEx-карта SMK-37 PRO эти кнопки вообще не описывает, неизвестно даже, шлют ли они что-то на
// хост по MIDI или это чисто меню внутренней прошивки (правка патча/секвенсора на экране).

export interface DecodedMidiMessage {
  hex: string
  channel: number | null // null для SysEx и нераспознанных статус-байт
  type: string
}

const STATUS_NAMES: Record<number, string> = {
  0x80: 'Note Off',
  0x90: 'Note On',
  0xa0: 'Poly Aftertouch',
  0xb0: 'Control Change',
  0xc0: 'Program Change',
  0xd0: 'Channel Aftertouch',
  0xe0: 'Pitch Bend',
}

export function decodeMidiMessage(bytes: Uint8Array): DecodedMidiMessage {
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(' ')

  const status = bytes[0]
  if (status === 0xf0) {
    return { hex, channel: null, type: `SysEx (${bytes.length} байт)` }
  }

  const type = STATUS_NAMES[status & 0xf0]
  if (!type) {
    return { hex, channel: null, type: `Неизвестно (0x${status.toString(16)})` }
  }

  const channel = (status & 0x0f) + 1
  const d1 = bytes.length > 1 ? bytes[1] : undefined
  const d2 = bytes.length > 2 ? bytes[2] : undefined
  const detail = d2 !== undefined ? `${d1} / ${d2}` : d1 !== undefined ? `${d1}` : ''
  return { hex, channel, type: detail ? `${type} (${detail})` : type }
}
