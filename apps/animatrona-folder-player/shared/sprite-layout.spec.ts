import { describe, expect, it } from 'vitest'
import {
  buildSpriteFilter,
  buildSpriteVtt,
  formatVttTimestamp,
  FRAME_HEIGHT,
  FRAME_WIDTH,
  planSpriteLayout,
  type SpriteLayout,
} from './sprite-layout'

describe('planSpriteLayout', () => {
  it('возвращает null для неположительной длительности', () => {
    expect(planSpriteLayout(0)).toBeNull()
    expect(planSpriteLayout(-10)).toBeNull()
  })

  it('возвращает null для NaN', () => {
    expect(planSpriteLayout(Number.NaN)).toBeNull()
  })

  it('возвращает null для Infinity', () => {
    expect(planSpriteLayout(Number.POSITIVE_INFINITY)).toBeNull()
  })

  it('короткое видео (60 сек) упирается в нижний порог интервала MIN_INTERVAL_SEC=5, а не в верхний предел кадров', () => {
    const layout = planSpriteLayout(60)
    expect(layout).not.toBeNull()
    // ceil(60/200)=1, но интервал не может быть меньше 5
    expect(layout?.intervalSec).toBe(5)
    // frameCount = ceil(60/5) = 12 — далеко не 200, значит ограничение сработало снизу
    expect(layout?.frameCount).toBe(12)
  })

  it('длинное видео (2 часа = 7200 сек) не превышает TARGET_FRAME_COUNT=200 — интервал масштабируется вверх', () => {
    const layout = planSpriteLayout(7200)
    expect(layout).not.toBeNull()
    // ceil(7200/200) = 36
    expect(layout?.intervalSec).toBe(36)
    expect(layout?.frameCount).toBeLessThanOrEqual(200)
    // с округлением вверх должно получиться ровно 200
    expect(layout?.frameCount).toBe(200)
  })

  it('columns не больше 10 (константа COLUMNS) даже на длинном видео', () => {
    const layout = planSpriteLayout(7200)
    expect(layout?.columns).toBeLessThanOrEqual(10)
  })

  it('columns не больше frameCount, если кадров меньше 10', () => {
    // 20 сек при MIN_INTERVAL_SEC=5 даёт 4 кадра — columns должен стать 4, не 10
    const layout = planSpriteLayout(20)
    expect(layout?.frameCount).toBe(4)
    expect(layout?.columns).toBe(4)
  })

  it('rows = ceil(frameCount / columns) — проверка на конкретных числах', () => {
    // 60 сек → frameCount=12, columns=10 → rows=ceil(12/10)=2
    const short = planSpriteLayout(60)
    expect(short?.frameCount).toBe(12)
    expect(short?.columns).toBe(10)
    expect(short?.rows).toBe(2)

    // 7200 сек → frameCount=200, columns=10 → rows=ceil(200/10)=20
    const long = planSpriteLayout(7200)
    expect(long?.frameCount).toBe(200)
    expect(long?.columns).toBe(10)
    expect(long?.rows).toBe(20)
  })

  it('frameWidth/frameHeight всегда равны экспортируемым константам', () => {
    const layouts = [planSpriteLayout(20), planSpriteLayout(60), planSpriteLayout(7200)]
    for (const layout of layouts) {
      expect(layout?.frameWidth).toBe(FRAME_WIDTH)
      expect(layout?.frameHeight).toBe(FRAME_HEIGHT)
    }
  })
})

describe('formatVttTimestamp', () => {
  it('0 секунд → 00:00:00.000', () => {
    expect(formatVttTimestamp(0)).toBe('00:00:00.000')
  })

  it('дробные секунды округляются в миллисекунды: 1.5 → 00:00:01.500', () => {
    expect(formatVttTimestamp(1.5)).toBe('00:00:01.500')
  })

  it('больше часа: 3661.25 → 01:01:01.250', () => {
    expect(formatVttTimestamp(3661.25)).toBe('01:01:01.250')
  })

  it('отрицательное значение зажимается до 0', () => {
    expect(formatVttTimestamp(-5)).toBe('00:00:00.000')
  })
})

describe('buildSpriteVtt', () => {
  const layout: SpriteLayout = {
    intervalSec: 5,
    columns: 3,
    rows: 2,
    frameWidth: FRAME_WIDTH,
    frameHeight: FRAME_HEIGHT,
    frameCount: 5,
  }

  it('результат начинается со строки WEBVTT и пустой строки', () => {
    const vtt = buildSpriteVtt('sprite.jpg', layout, 30)
    const lines = vtt.split('\n')
    expect(lines[0]).toBe('WEBVTT')
    expect(lines[1]).toBe('')
  })

  it('число временных блоков (-->) равно layout.frameCount', () => {
    const vtt = buildSpriteVtt('sprite.jpg', layout, 30)
    const arrowCount = vtt.split('\n').filter((line) => line.includes('-->')).length
    expect(arrowCount).toBe(layout.frameCount)
  })

  it('первый cue начинается с 00:00:00.000', () => {
    const vtt = buildSpriteVtt('sprite.jpg', layout, 30)
    const firstArrowLine = vtt.split('\n').find((line) => line.includes('-->'))
    expect(firstArrowLine?.startsWith('00:00:00.000')).toBe(true)
  })

  it('у последнего cue endTime тянется минимум до durationSec, не обрывается раньше конца файла', () => {
    // frameCount=5, intervalSec=5 → номинальный конец 25 сек, но реальная длительность 30
    const durationSec = 30
    const vtt = buildSpriteVtt('sprite.jpg', layout, durationSec)
    const arrowLines = vtt.split('\n').filter((line) => line.includes('-->'))
    const lastLine = arrowLines[arrowLines.length - 1]
    expect(lastLine).toBe(`${formatVttTimestamp(20)} --> ${formatVttTimestamp(durationSec)}`)
  })

  it('координаты xywh идут по сетке слева направо, сверху вниз — четвёртый кадр (индекс 3) переходит на вторую строку', () => {
    const vtt = buildSpriteVtt('sprite.jpg', layout, 30)
    const lines = vtt.split('\n')
    // структура: WEBVTT, '', затем на каждый кадр — временная строка, payload, пустая строка
    // индекс 3 (четвёртый кадр) — payload находится по смещению 2 + 3*3 + 1
    const payloadLine = lines[2 + 3 * 3 + 1]
    expect(payloadLine).toBe(`sprite.jpg#xywh=0,${layout.frameHeight},${layout.frameWidth},${layout.frameHeight}`)
  })

  it('имя файла спрайта в payload совпадает с переданным первым аргументом', () => {
    const vtt = buildSpriteVtt('custom-name.jpg', layout, 30)
    expect(vtt).toContain('custom-name.jpg#xywh=')
  })
})

describe('buildSpriteFilter', () => {
  it('возвращает строку через запятую с fps/scale/crop/tile в правильном порядке и реальными числами', () => {
    const layout: SpriteLayout = {
      intervalSec: 36,
      columns: 10,
      rows: 20,
      frameWidth: FRAME_WIDTH,
      frameHeight: FRAME_HEIGHT,
      frameCount: 200,
    }

    const filter = buildSpriteFilter(layout)
    const parts = filter.split(',')

    expect(parts[0]).toBe('fps=1/36')
    expect(parts[1]).toBe('scale=160:90:force_original_aspect_ratio=increase')
    expect(parts[2]).toBe('crop=160:90')
    expect(parts[3]).toBe('tile=10x20')
  })
})
