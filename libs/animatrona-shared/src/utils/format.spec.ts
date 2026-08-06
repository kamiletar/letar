// globals: true в vitest.config.ts — describe, expect, it доступны глобально
//
// Этот модуль — чистый реэкспорт из @letar/animatrona-utils (см. комментарий в format.ts).
// Полное покрытие самой логики форматирования уже есть в
// libs/animatrona-utils/src/format.spec.ts — здесь только smoke-тест, что реэкспорт
// действительно работает и не потерял ни одну функцию/сигнатуру.
import {
  formatBitrate,
  formatBitrateKbps,
  formatBytes,
  formatChannels,
  formatDuration,
  formatDurationHuman,
  formatDurationMs,
  formatFps,
} from './format'

describe('реэкспорт утилит форматирования', () => {
  it('formatBytes форматирует размер файла', () => {
    expect(formatBytes(1536)).toBe('1.5 KB')
  })

  it('formatDuration форматирует таймкод', () => {
    expect(formatDuration(65)).toBe('1:05')
  })

  it('formatDurationHuman форматирует человекочитаемую длительность', () => {
    expect(formatDurationHuman(125)).toBe('2м 5с')
  })

  it('formatDurationMs конвертирует миллисекунды перед форматированием', () => {
    expect(formatDurationMs(125000)).toBe('2м 5с')
  })

  it('formatBitrate форматирует битрейт из bits/sec', () => {
    expect(formatBitrate(5_200_000)).toBe('5.2 Mbps')
  })

  it('formatBitrateKbps форматирует битрейт из kbps', () => {
    expect(formatBitrateKbps(256)).toBe('256 kbps')
  })

  it('formatFps форматирует частоту кадров', () => {
    expect(formatFps(23.976)).toBe('24 fps')
  })

  it('formatChannels маппит число каналов на лейбл', () => {
    expect(formatChannels(2)).toBe('Stereo')
    expect(formatChannels(6)).toBe('5.1')
  })
})
