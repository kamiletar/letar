/**
 * Тесты для audio-utils.
 */

import {
  BASS_HISTORY_SIZE,
  computeAverage,
  computeEnergyJumpIntensity,
  computeFrequencyBins,
  DEFAULT_ANALYZER_OPTIONS,
  detectBeat,
  FREQUENCY_RANGES,
  INITIAL_ANALYZER_DATA,
} from '../audio-utils'

describe('audio-utils constants', () => {
  describe('INITIAL_ANALYZER_DATA', () => {
    it('должен иметь нулевые начальные значения', () => {
      expect(INITIAL_ANALYZER_DATA.amplitude).toBe(0)
      expect(INITIAL_ANALYZER_DATA.bass).toBe(0)
      expect(INITIAL_ANALYZER_DATA.mid).toBe(0)
      expect(INITIAL_ANALYZER_DATA.high).toBe(0)
      expect(INITIAL_ANALYZER_DATA.beatDetected).toBe(false)
      expect(INITIAL_ANALYZER_DATA.beatIntensity).toBe(0)
    })

    it('должен иметь undefined для состояния микрофона', () => {
      expect(INITIAL_ANALYZER_DATA.hasMicrophoneAccess).toBeUndefined()
      expect(INITIAL_ANALYZER_DATA.microphoneError).toBeUndefined()
    })
  })

  describe('FREQUENCY_RANGES', () => {
    it('должен определять диапазон баса', () => {
      expect(FREQUENCY_RANGES.bass.min).toBe(20)
      expect(FREQUENCY_RANGES.bass.max).toBe(250)
    })

    it('должен определять средний диапазон', () => {
      expect(FREQUENCY_RANGES.mid.min).toBe(250)
      expect(FREQUENCY_RANGES.mid.max).toBe(2000)
    })

    it('должен определять высокий диапазон', () => {
      expect(FREQUENCY_RANGES.high.min).toBe(2000)
      expect(FREQUENCY_RANGES.high.max).toBe(20000)
    })

    it('диапазоны должны быть непрерывными', () => {
      expect(FREQUENCY_RANGES.bass.max).toBe(FREQUENCY_RANGES.mid.min)
      expect(FREQUENCY_RANGES.mid.max).toBe(FREQUENCY_RANGES.high.min)
    })
  })

  describe('BASS_HISTORY_SIZE', () => {
    it('должен быть 15', () => {
      expect(BASS_HISTORY_SIZE).toBe(15)
    })
  })

  describe('DEFAULT_ANALYZER_OPTIONS', () => {
    it('должен иметь правильный fftSize', () => {
      expect(DEFAULT_ANALYZER_OPTIONS.fftSize).toBe(512)
    })

    it('должен иметь smoothingTimeConstant в диапазоне 0-1', () => {
      expect(DEFAULT_ANALYZER_OPTIONS.smoothingTimeConstant).toBeGreaterThanOrEqual(0)
      expect(DEFAULT_ANALYZER_OPTIONS.smoothingTimeConstant).toBeLessThanOrEqual(1)
    })

    it('должен иметь energyThresholdMultiplier >= 1', () => {
      expect(DEFAULT_ANALYZER_OPTIONS.energyThresholdMultiplier).toBeGreaterThanOrEqual(1)
    })

    it('должен иметь положительный beatCooldown', () => {
      expect(DEFAULT_ANALYZER_OPTIONS.beatCooldown).toBeGreaterThan(0)
    })
  })
})

describe('computeFrequencyBins', () => {
  it('должен вычислить границы для стандартного sample rate', () => {
    const sampleRate = 44100
    const fftSize = 512
    const binCount = fftSize / 2

    const result = computeFrequencyBins(sampleRate, fftSize, binCount)

    expect(result.bassEnd).toBeGreaterThan(0)
    expect(result.midEnd).toBeGreaterThan(result.bassEnd)
    expect(result.midEnd).toBeLessThanOrEqual(binCount)
  })

  it('должен вычислить границы для 48000 Hz sample rate', () => {
    const sampleRate = 48000
    const fftSize = 1024
    const binCount = fftSize / 2

    const result = computeFrequencyBins(sampleRate, fftSize, binCount)

    expect(result.bassEnd).toBeGreaterThan(0)
    expect(result.midEnd).toBeGreaterThan(result.bassEnd)
  })

  it('не должен превышать binCount', () => {
    const sampleRate = 22050
    const fftSize = 32
    const binCount = fftSize / 2

    const result = computeFrequencyBins(sampleRate, fftSize, binCount)

    expect(result.bassEnd).toBeLessThanOrEqual(binCount)
    expect(result.midEnd).toBeLessThanOrEqual(binCount)
  })

  it('bassEnd должен увеличиваться с увеличением fftSize', () => {
    const sampleRate = 44100
    const smallFft = computeFrequencyBins(sampleRate, 256, 128)
    const largeFft = computeFrequencyBins(sampleRate, 1024, 512)

    expect(largeFft.bassEnd).toBeGreaterThan(smallFft.bassEnd)
  })
})

describe('computeAverage', () => {
  it('должен вернуть 0 для пустого массива', () => {
    expect(computeAverage([])).toBe(0)
  })

  it('должен вернуть само значение для массива из одного элемента', () => {
    expect(computeAverage([5])).toBe(5)
  })

  it('должен вычислить среднее для нескольких значений', () => {
    expect(computeAverage([2, 4, 6])).toBe(4)
  })

  it('должен работать с дробными числами', () => {
    expect(computeAverage([0.1, 0.3, 0.5])).toBeCloseTo(0.3, 5)
  })

  it('должен работать с нулями', () => {
    expect(computeAverage([0, 0, 0])).toBe(0)
  })

  it('должен работать с отрицательными числами', () => {
    expect(computeAverage([-1, 0, 1])).toBe(0)
  })
})

describe('computeEnergyJumpIntensity', () => {
  it('должен вернуть 0 если average близко к 0', () => {
    const result = computeEnergyJumpIntensity(0.5, 0.005, 1.5)
    expect(result).toBe(0)
  })

  it('должен вернуть 0 если current <= average', () => {
    const result = computeEnergyJumpIntensity(0.3, 0.5, 1.5)
    expect(result).toBe(0)
  })

  it('должен вернуть 1 если скачок достигает порога', () => {
    // current / average = 1.5, thresholdMultiplier = 1.5
    // intensity = (1.5 - 1) / (1.5 - 1) = 1
    const result = computeEnergyJumpIntensity(0.75, 0.5, 1.5)
    expect(result).toBeCloseTo(1, 5)
  })

  it('должен вернуть промежуточное значение', () => {
    // current = 0.6, average = 0.5, thresholdMultiplier = 1.5
    // energyJump = 0.6 / 0.5 = 1.2
    // intensity = (1.2 - 1) / (1.5 - 1) = 0.2 / 0.5 = 0.4
    const result = computeEnergyJumpIntensity(0.6, 0.5, 1.5)
    expect(result).toBeCloseTo(0.4, 5)
  })

  it('должен ограничивать результат до 1', () => {
    // current >> average
    const result = computeEnergyJumpIntensity(1.0, 0.1, 1.5)
    expect(result).toBe(1)
  })

  it('должен ограничивать результат до 0', () => {
    const result = computeEnergyJumpIntensity(0.1, 0.5, 1.5)
    expect(result).toBe(0)
  })
})

describe('detectBeat', () => {
  beforeEach(() => {
    vi.spyOn(performance, 'now').mockReturnValue(1000)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('должен обнаружить бит при превышении порога', () => {
    const result = detectBeat(
      0.6, // currentBass
      0.3, // avgBass
      1.5, // thresholdMultiplier (0.3 * 1.5 = 0.45, 0.6 > 0.45)
      0.1, // minBassLevel
      0, // lastBeatTime
      100, // cooldown
    )

    expect(result).toBe(true)
  })

  it('не должен обнаружить бит если currentBass < threshold', () => {
    const result = detectBeat(
      0.4, // currentBass
      0.3, // avgBass
      1.5, // thresholdMultiplier (0.3 * 1.5 = 0.45, 0.4 < 0.45)
      0.1, // minBassLevel
      0, // lastBeatTime
      100, // cooldown
    )

    expect(result).toBe(false)
  })

  it('не должен обнаружить бит если currentBass < minBassLevel', () => {
    const result = detectBeat(
      0.05, // currentBass < minBassLevel
      0.02, // avgBass
      1.5, // thresholdMultiplier
      0.1, // minBassLevel
      0, // lastBeatTime
      100, // cooldown
    )

    expect(result).toBe(false)
  })

  it('не должен обнаружить бит во время cooldown', () => {
    // performance.now() = 1000, lastBeatTime = 950, cooldown = 100
    // 1000 - 950 = 50 < 100
    const result = detectBeat(
      0.6, // currentBass
      0.3, // avgBass
      1.5, // thresholdMultiplier
      0.1, // minBassLevel
      950, // lastBeatTime
      100, // cooldown
    )

    expect(result).toBe(false)
  })

  it('должен обнаружить бит после cooldown', () => {
    // performance.now() = 1000, lastBeatTime = 800, cooldown = 100
    // 1000 - 800 = 200 > 100
    const result = detectBeat(
      0.6, // currentBass
      0.3, // avgBass
      1.5, // thresholdMultiplier
      0.1, // minBassLevel
      800, // lastBeatTime
      100, // cooldown
    )

    expect(result).toBe(true)
  })
})
