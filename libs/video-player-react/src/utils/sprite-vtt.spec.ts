import { describe, expect, it } from 'vitest'

import { findCueAtTime, parseSpriteCues } from './sprite-vtt'

const SAMPLE_VTT = `WEBVTT

00:00:00.000 --> 00:00:05.000
sprite.jpg#xywh=0,0,160,90

00:00:05.000 --> 00:00:10.000
sprite.jpg#xywh=160,0,160,90

00:00:10.000 --> 00:00:15.000
sprite.jpg#xywh=0,90,160,90
`

describe('parseSpriteCues', () => {
  it('парсит все cue из корректного VTT', () => {
    const cues = parseSpriteCues(SAMPLE_VTT)

    expect(cues).toHaveLength(3)
    expect(cues[0]).toEqual({ startTime: 0, endTime: 5, x: 0, y: 0, width: 160, height: 90 })
    expect(cues[1]).toEqual({ startTime: 5, endTime: 10, x: 160, y: 0, width: 160, height: 90 })
    expect(cues[2]).toEqual({ startTime: 10, endTime: 15, x: 0, y: 90, width: 160, height: 90 })
  })

  it('парсит таймкоды в формате HH:MM:SS.mmm', () => {
    const vtt = `WEBVTT

01:02:03.000 --> 01:02:08.000
sprite.jpg#xywh=0,0,10,10
`
    const cues = parseSpriteCues(vtt)
    expect(cues[0].startTime).toBe(3723)
    expect(cues[0].endTime).toBe(3728)
  })

  it('парсит таймкоды в формате MM:SS.mmm (без часов)', () => {
    const vtt = `WEBVTT

02:03.000 --> 02:08.000
sprite.jpg#xywh=0,0,10,10
`
    const cues = parseSpriteCues(vtt)
    expect(cues[0].startTime).toBe(123)
    expect(cues[0].endTime).toBe(128)
  })

  it('возвращает пустой массив для пустой строки', () => {
    expect(parseSpriteCues('')).toEqual([])
  })

  it('возвращает пустой массив для VTT без cue', () => {
    expect(parseSpriteCues('WEBVTT\n')).toEqual([])
  })

  it('пропускает строки с таймкодом без валидного xywh payload', () => {
    const vtt = `WEBVTT

00:00:00.000 --> 00:00:05.000
sprite.jpg (без координат)
`
    expect(parseSpriteCues(vtt)).toEqual([])
  })

  it('игнорирует cue с отсутствующим payload после таймкода (конец файла)', () => {
    const vtt = `WEBVTT

00:00:00.000 --> 00:00:05.000`
    expect(parseSpriteCues(vtt)).toEqual([])
  })
})

describe('findCueAtTime', () => {
  const cues = parseSpriteCues(SAMPLE_VTT)

  it('находит cue содержащий заданное время', () => {
    expect(findCueAtTime(cues, 7)).toEqual(cues[1])
  })

  it('находит cue на границе startTime (включительно)', () => {
    expect(findCueAtTime(cues, 5)).toEqual(cues[1])
  })

  it('не находит cue на границе endTime (эксклюзивно)', () => {
    // endTime у cues[0] === startTime у cues[1] — время 5 принадлежит cues[1], не cues[0]
    const cue = findCueAtTime(cues, 5)
    expect(cue).not.toBe(cues[0])
  })

  it('возвращает null для времени до первого cue', () => {
    expect(findCueAtTime(cues, -1)).toBeNull()
  })

  it('возвращает null для времени после последнего cue', () => {
    expect(findCueAtTime(cues, 100)).toBeNull()
  })

  it('возвращает null для пустого массива cue', () => {
    expect(findCueAtTime([], 5)).toBeNull()
  })

  it('находит cue в начале массива', () => {
    expect(findCueAtTime(cues, 0)).toEqual(cues[0])
  })

  it('находит cue в конце массива', () => {
    expect(findCueAtTime(cues, 14.999)).toEqual(cues[2])
  })
})
