import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { encodeSingleVoiceSysex } from './dx7-sysex'
import { FM_BASS } from './fm-defaults'
import { readSyxFile } from './syx-file'

describe('syx-file: чтение .syx-файла', () => {
  it('распознаёт single-voice файл и восстанавливает патч', async () => {
    const sysex = encodeSingleVoiceSysex(FM_BASS.engine, FM_BASS.name)
    const file = new File([sysex], 'fm-bass.syx', { type: 'application/octet-stream' })

    const result = await readSyxFile(file)

    expect(result.voiceCount).toBe(1)
    expect(result.name).toBe(FM_BASS.name.toUpperCase().slice(0, 10).trimEnd())
    expect(result.engine.algorithm).toBe(FM_BASS.engine.algorithm)
  })

  it('распознаёт 32-голосый bulk-банк и возвращает первый голос', async () => {
    const bytes = readFileSync(join(__dirname, '__fixtures__/smk37-pro-presets-1.syx'))
    const file = new File([bytes], 'bank.syx', { type: 'application/octet-stream' })

    const result = await readSyxFile(file)

    expect(result.voiceCount).toBe(32)
    expect(result.name.length).toBeGreaterThan(0)
  })
})
