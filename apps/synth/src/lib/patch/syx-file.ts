import { decodeBulkDump, decodeSingleVoiceSysex, encodeSingleVoiceSysex } from './dx7-sysex'
import type { FmEngineParams, FmPatch } from './schema'

/** Скачивает FM-патч как `.syx`-файл (single-voice DX7 dump) — открывается на любом DX7-совместимом железе/плагине */
export function downloadPatchSyx(patch: FmPatch): void {
  const bytes = encodeSingleVoiceSysex(patch.engine, patch.name)
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${patch.id}.syx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export interface SyxImportResult {
  name: string
  engine: FmEngineParams
  /** Сколько голосов было в файле — >1 значит это bulk-банк, импортирован только первый */
  voiceCount: number
}

/** Разбирает загруженный `.syx`-файл — распознаёт как single-voice, так и 32-голосый bulk dump */
export async function readSyxFile(file: File): Promise<SyxImportResult> {
  const buf = new Uint8Array(await file.arrayBuffer())
  if (buf[3] === 0x09) {
    const voices = decodeBulkDump(buf)
    const first = voices[0]
    return { ...first, voiceCount: voices.length }
  }
  const single = decodeSingleVoiceSysex(buf)
  return { ...single, voiceCount: 1 }
}
