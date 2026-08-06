// globals: true в vitest.config.ts — describe, expect, it доступны глобально
import {
  calculateCompressionRatio,
  formatBitrate,
  formatBitrateKbps,
  formatBytes,
  formatChannels,
  formatDuration,
  formatDurationHuman,
  formatDurationMinutes,
  formatDurationMs,
  formatFileSize,
  formatFileSizeRu,
  formatFps,
  formatSeedingTime,
  formatSpeed,
  formatTransferSpeed,
} from './format'

describe('formatFileSize', () => {
  it('возвращает "--" для null/undefined', () => {
    expect(formatFileSize(null)).toBe('--')
    expect(formatFileSize(undefined)).toBe('--')
  })

  it('форматирует байты без дробной части', () => {
    expect(formatFileSize(512)).toBe('512 B')
  })

  it('форматирует килобайты с одним знаком после запятой', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB')
  })

  it('форматирует мегабайты', () => {
    expect(formatFileSize(1024 * 1024 * 2.5)).toBe('2.5 MB')
  })

  it('форматирует гигабайты с двумя знаками после запятой', () => {
    expect(formatFileSize(1024 * 1024 * 1024 * 1.25)).toBe('1.25 GB')
  })

  it('граница KB/B ровно на 1024', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB')
  })
})

describe('formatBytes', () => {
  it('возвращает "--" для null/undefined', () => {
    expect(formatBytes(null)).toBe('--')
    expect(formatBytes(undefined)).toBe('--')
  })

  it('возвращает "--" для NaN/Infinity', () => {
    expect(formatBytes(Number.NaN)).toBe('--')
    expect(formatBytes(Number.POSITIVE_INFINITY)).toBe('--')
  })

  it('возвращает "--" для отрицательных значений', () => {
    expect(formatBytes(-1)).toBe('--')
  })

  it('возвращает "0 B" для нуля', () => {
    expect(formatBytes(0)).toBe('0 B')
  })

  it('целое число байт без дробной части', () => {
    expect(formatBytes(512)).toBe('512 B')
  })

  it('форматирует килобайты с одним знаком после запятой', () => {
    expect(formatBytes(1536)).toBe('1.5 KB')
  })

  it('форматирует мегабайты', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB')
  })

  it('не выходит за пределы units для дробных 0 < bytes < 1 (клампится на индекс B, без дробной части)', () => {
    expect(formatBytes(0.5)).toBe('1 B')
  })

  it('клампится на TB для очень больших значений', () => {
    const huge = 1024 ** 5 * 3
    expect(formatBytes(huge)).toBe('3072.0 TB')
  })
})

describe('formatFileSizeRu', () => {
  it('форматирует байты без дробной части', () => {
    expect(formatFileSizeRu(500)).toBe('500 Б')
  })

  it('форматирует килобайты в русских единицах', () => {
    expect(formatFileSizeRu(2048)).toBe('2.0 КБ')
  })

  it('принимает bigint', () => {
    expect(formatFileSizeRu(1024n)).toBe('1.0 КБ')
  })

  it('форматирует мегабайты', () => {
    expect(formatFileSizeRu(1024 * 1024 * 3)).toBe('3.0 МБ')
  })
})

describe('formatDuration', () => {
  it('возвращает "--" для null/undefined/не-finite', () => {
    expect(formatDuration(null)).toBe('--')
    expect(formatDuration(undefined)).toBe('--')
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe('--')
  })

  it('форматирует без часов как mm:ss', () => {
    expect(formatDuration(65)).toBe('1:05')
  })

  it('форматирует с часами как h:mm:ss', () => {
    expect(formatDuration(3725)).toBe('1:02:05')
  })

  it('округляет вниз дробные секунды', () => {
    expect(formatDuration(59.9)).toBe('0:59')
  })

  it('ноль секунд', () => {
    expect(formatDuration(0)).toBe('0:00')
  })
})

describe('formatDurationHuman', () => {
  it('возвращает "--:--" для undefined/отрицательных/не-finite', () => {
    expect(formatDurationHuman(undefined)).toBe('--:--')
    expect(formatDurationHuman(-1)).toBe('--:--')
    expect(formatDurationHuman(Number.POSITIVE_INFINITY)).toBe('--:--')
  })

  it('только секунды', () => {
    expect(formatDurationHuman(45)).toBe('45с')
  })

  it('минуты и секунды', () => {
    expect(formatDurationHuman(125)).toBe('2м 5с')
  })

  it('часы, минуты и секунды', () => {
    expect(formatDurationHuman(3725)).toBe('1ч 2м 5с')
  })
})

describe('formatDurationMs', () => {
  it('возвращает "--:--" для undefined/отрицательных', () => {
    expect(formatDurationMs(undefined)).toBe('--:--')
    expect(formatDurationMs(-100)).toBe('--:--')
  })

  it('конвертирует миллисекунды в секунды перед форматированием', () => {
    expect(formatDurationMs(125000)).toBe('2м 5с')
  })
})

describe('formatSeedingTime', () => {
  it('возвращает "< 1 мин" для значений короче минуты', () => {
    expect(formatSeedingTime(30000)).toBe('< 1 мин')
  })

  it('форматирует только минуты', () => {
    expect(formatSeedingTime(2700000)).toBe('45мин')
  })

  it('форматирует часы без минут', () => {
    expect(formatSeedingTime(7200000)).toBe('2ч')
  })

  it('форматирует часы с минутами', () => {
    expect(formatSeedingTime(7200000 + 15 * 60000)).toBe('2ч 15мин')
  })

  it('форматирует дни без часов', () => {
    expect(formatSeedingTime(86400000)).toBe('1д')
  })

  it('форматирует дни с часами', () => {
    expect(formatSeedingTime(90000000)).toBe('1д 1ч')
  })

  it('принимает bigint', () => {
    expect(formatSeedingTime(7200000n)).toBe('2ч')
  })
})

describe('formatBitrate', () => {
  it('возвращает "--" для null/undefined', () => {
    expect(formatBitrate(null)).toBe('--')
    expect(formatBitrate(undefined)).toBe('--')
  })

  it('форматирует Mbps для значений >= 1_000_000', () => {
    expect(formatBitrate(5_200_000)).toBe('5.2 Mbps')
  })

  it('форматирует kbps для значений < 1_000_000', () => {
    expect(formatBitrate(320_000)).toBe('320 kbps')
  })

  it('граница ровно на 1_000_000 переходит в Mbps', () => {
    expect(formatBitrate(1_000_000)).toBe('1.0 Mbps')
  })
})

describe('formatBitrateKbps', () => {
  it('возвращает "--" для undefined/отрицательных', () => {
    expect(formatBitrateKbps(undefined)).toBe('--')
    expect(formatBitrateKbps(-5)).toBe('--')
  })

  it('форматирует kbps ниже границы', () => {
    expect(formatBitrateKbps(256)).toBe('256 kbps')
  })

  it('форматирует Mbps на границе и выше', () => {
    expect(formatBitrateKbps(1000)).toBe('1.0 Mbps')
    expect(formatBitrateKbps(2500)).toBe('2.5 Mbps')
  })
})

describe('formatSpeed', () => {
  it('возвращает "--" для undefined/отрицательных/не-finite', () => {
    expect(formatSpeed(undefined)).toBe('--')
    expect(formatSpeed(-1)).toBe('--')
    expect(formatSpeed(Number.POSITIVE_INFINITY)).toBe('--')
  })

  it('форматирует с двумя знаками после запятой и суффиксом x', () => {
    expect(formatSpeed(1.5)).toBe('1.50x')
  })

  it('ноль — валидное значение', () => {
    expect(formatSpeed(0)).toBe('0.00x')
  })
})

describe('formatTransferSpeed', () => {
  it('возвращает "0 B/s" для null/undefined/NaN/< 1', () => {
    expect(formatTransferSpeed(null)).toBe('0 B/s')
    expect(formatTransferSpeed(undefined)).toBe('0 B/s')
    expect(formatTransferSpeed(Number.NaN)).toBe('0 B/s')
    expect(formatTransferSpeed(0.5)).toBe('0 B/s')
  })

  it('форматирует B/s', () => {
    expect(formatTransferSpeed(512)).toBe('512 B/s')
  })

  it('форматирует MB/s', () => {
    expect(formatTransferSpeed(1024 * 1024 * 5.2)).toBe('5.2 MB/s')
  })
})

describe('formatFps', () => {
  it('возвращает "--" для undefined/отрицательных/не-finite', () => {
    expect(formatFps(undefined)).toBe('--')
    expect(formatFps(-1)).toBe('--')
    expect(formatFps(Number.POSITIVE_INFINITY)).toBe('--')
  })

  it('округляет до целого и добавляет суффикс fps', () => {
    expect(formatFps(23.976)).toBe('24 fps')
  })
})

describe('formatChannels', () => {
  it('маппит известные значения на человекочитаемые лейблы', () => {
    expect(formatChannels(1)).toBe('Mono')
    expect(formatChannels(2)).toBe('Stereo')
    expect(formatChannels(6)).toBe('5.1')
    expect(formatChannels(8)).toBe('7.1')
  })

  it('падает в дефолт "<n>ch" для неизвестных значений', () => {
    expect(formatChannels(4)).toBe('4ch')
    expect(formatChannels(0)).toBe('0ch')
  })
})

describe('formatDurationMinutes', () => {
  it('возвращает пустую строку для null/undefined/не-finite/<=0', () => {
    expect(formatDurationMinutes(null)).toBe('')
    expect(formatDurationMinutes(undefined)).toBe('')
    expect(formatDurationMinutes(Number.POSITIVE_INFINITY)).toBe('')
    expect(formatDurationMinutes(0)).toBe('')
    expect(formatDurationMinutes(-10)).toBe('')
  })

  it('форматирует только минуты для значений короче часа', () => {
    expect(formatDurationMinutes(23 * 60)).toBe('23 мин')
  })

  it('форматирует часы и минуты', () => {
    expect(formatDurationMinutes(83 * 60)).toBe('1 ч 23 мин')
  })

  it('форматирует ровные часы без минут', () => {
    expect(formatDurationMinutes(120 * 60)).toBe('2 ч')
  })

  it('округляет секунды до ближайшей минуты', () => {
    expect(formatDurationMinutes(89)).toBe('1 мин')
  })
})

describe('calculateCompressionRatio', () => {
  it('возвращает undefined, если inputSize отсутствует/равен нулю', () => {
    expect(calculateCompressionRatio(undefined, 100)).toBeUndefined()
    expect(calculateCompressionRatio(0, 100)).toBeUndefined()
  })

  it('возвращает undefined, если outputSize отсутствует', () => {
    expect(calculateCompressionRatio(100, undefined)).toBeUndefined()
  })

  it('вычисляет процент от оригинала', () => {
    expect(calculateCompressionRatio(1000, 250)).toBe(25)
  })

  it('может вернуть значение больше 100, если выход больше входа', () => {
    expect(calculateCompressionRatio(100, 150)).toBe(150)
  })
})
