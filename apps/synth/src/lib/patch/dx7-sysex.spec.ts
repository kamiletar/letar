import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getAlgorithm } from './dx7-algorithms'
import { decodeBulkDump, decodeSingleVoiceSysex, encodeSingleVoiceSysex } from './dx7-sysex'
import { FM_BASS, FM_GLASS_BELLS } from './fm-defaults'

describe('dx7-sysex: round-trip модели патча ↔ single-voice SysEx', () => {
  it.each([
    ['FM Bass', FM_BASS],
    ['Glass Bells', FM_GLASS_BELLS],
  ])('%s: encode → decode сохраняет поддерживаемые параметры', (_label, patch) => {
    const sysex = encodeSingleVoiceSysex(patch.engine, patch.name)

    // Заголовок и хвост стандартного single-voice dump
    expect(sysex[0]).toBe(0xf0)
    expect(sysex[1]).toBe(0x43)
    expect(sysex[3]).toBe(0x00) // format 0 = 1 voice
    expect(sysex[4]).toBe(0x01)
    expect(sysex[5]).toBe(0x1b)
    expect(sysex.length).toBe(163) // 6 header + 155 data + checksum + F7
    expect(sysex[sysex.length - 1]).toBe(0xf7)

    const decoded = decodeSingleVoiceSysex(sysex)
    // DX7 ограничивает имя 10 ASCII-символами
    expect(decoded.name).toBe(patch.name.toUpperCase().slice(0, 10).trimEnd())
    expect(decoded.engine.algorithm).toBe(patch.engine.algorithm)
    expect(decoded.engine.pitchEg).toEqual(patch.engine.pitchEg)
    expect(decoded.engine.lfo).toEqual(patch.engine.lfo)

    const fbOp = getAlgorithm(patch.engine.algorithm).fbOp
    patch.engine.operators.forEach((op, i) => {
      const decodedOp = decoded.engine.operators[i]
      expect(decodedOp.level).toBe(op.level)
      expect(decodedOp.eg).toEqual(op.eg)
      expect(decodedOp.velocitySensitivity).toBe(op.velocitySensitivity)
      expect(decodedOp.fixed).toBe(op.fixed)
      // feedback в реальном DX7 глобален и хранится только на fbOp текущего алгоритма —
      // на остальных операторах он теряется, это ожидаемо и задокументировано
      if (i === fbOp) {
        expect(decodedOp.feedback).toBe(op.feedback)
      }
    })
  })

  it('битый checksum/заголовок не проходит молча', () => {
    const sysex = encodeSingleVoiceSysex(FM_BASS.engine, FM_BASS.name)
    const corrupted = new Uint8Array(sysex)
    corrupted[1] = 0x41 // не Yamaha ID
    expect(() => decodeSingleVoiceSysex(corrupted)).toThrow()
  })
})

describe('dx7-sysex: реальные данные с железа (SMK-37 PRO)', () => {
  it('разбирает заводской банк пресетов (32 голоса, стандартный DX7 bulk dump)', () => {
    const bytes = readFileSync(join(__dirname, '__fixtures__/smk37-pro-presets-1.syx'))
    const voices = decodeBulkDump(new Uint8Array(bytes))

    expect(voices).toHaveLength(32)
    for (const voice of voices) {
      expect(voice.engine.algorithm).toBeGreaterThanOrEqual(1)
      expect(voice.engine.algorithm).toBeLessThanOrEqual(32)
      expect(voice.name.length).toBeGreaterThan(0)
    }

    // Последний голос в файле — известное значение (проверено побайтово по hex-дампу фикстуры)
    expect(voices[31].name).toBe('E.GUITAR 1')
  })
})
