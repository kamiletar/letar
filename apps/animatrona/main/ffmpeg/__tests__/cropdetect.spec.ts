import { describe, expect, it } from 'vitest'
import { parseLastCropRect, pickModeRect } from '../cropdetect'

describe('parseLastCropRect', () => {
  it('извлекает единственную найденную рамку', () => {
    const stderr = '[Parsed_cropdetect_0 @ 0x1] x1:0 x2:1919 y1:140 y2:939 crop=1920:800:0:140'
    expect(parseLastCropRect(stderr)).toEqual({ width: 1920, height: 800, x: 0, y: 140 })
  })

  it('берёт последнюю (наиболее уточнённую) рамку из нескольких кадров', () => {
    const stderr = [
      'frame=1 crop=1920:816:0:132',
      'frame=2 crop=1920:808:0:136',
      'frame=3 crop=1920:800:0:140',
    ].join('\n')
    expect(parseLastCropRect(stderr)).toEqual({ width: 1920, height: 800, x: 0, y: 140 })
  })

  it('возвращает null, если рамка не найдена', () => {
    expect(parseLastCropRect('ffmpeg version 6.0 ...')).toBeNull()
  })

  it('корректно работает при повторных вызовах (сброс lastIndex глобального regex)', () => {
    const stderr = 'crop=1280:720:0:0'
    expect(parseLastCropRect(stderr)).toEqual({ width: 1280, height: 720, x: 0, y: 0 })
    expect(parseLastCropRect(stderr)).toEqual({ width: 1280, height: 720, x: 0, y: 0 })
  })
})

describe('pickModeRect', () => {
  it('возвращает null для пустого массива', () => {
    expect(pickModeRect([])).toBeNull()
  })

  it('возвращает единственную рамку', () => {
    const rect = { width: 1920, height: 800, x: 0, y: 140 }
    expect(pickModeRect([rect])).toEqual(rect)
  })

  it('выбирает самую частую рамку среди согласных сэмплов', () => {
    const common = { width: 1920, height: 800, x: 0, y: 140 }
    const outlier = { width: 1920, height: 1080, x: 0, y: 0 }
    expect(pickModeRect([common, common, common, outlier])).toEqual(common)
  })

  it('игнорирует одиночный аномальный сэмпл (чёрная заставка/переход)', () => {
    const stable = { width: 1920, height: 800, x: 0, y: 140 }
    const blackFrame = { width: 100, height: 100, x: 0, y: 0 }
    expect(pickModeRect([stable, stable, blackFrame])).toEqual(stable)
  })
})
