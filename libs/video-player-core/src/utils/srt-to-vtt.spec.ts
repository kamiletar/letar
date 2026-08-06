import { describe, expect, it } from 'vitest'
import { srtToVtt } from './srt-to-vtt'

describe('srtToVtt', () => {
  it('конвертирует одну реплику SRT в WebVTT', () => {
    const srt = '1\n00:00:01,000 --> 00:00:04,000\nFirst subtitle\n'

    expect(srtToVtt(srt)).toBe('WEBVTT\n\n00:00:01.000 --> 00:00:04.000\nFirst subtitle\n')
  })

  it('конвертирует несколько реплик подряд', () => {
    const srt = [
      '1',
      '00:00:01,000 --> 00:00:04,000',
      'First subtitle',
      '',
      '2',
      '00:00:05,500 --> 00:00:08,250',
      'Second subtitle',
      'на второй строке',
      '',
    ].join('\n')

    const vtt = srtToVtt(srt)

    expect(vtt).toContain('WEBVTT')
    expect(vtt).toContain('00:00:01.000 --> 00:00:04.000')
    expect(vtt).toContain('First subtitle')
    expect(vtt).toContain('00:00:05.500 --> 00:00:08.250')
    expect(vtt).toContain('Second subtitle')
    expect(vtt).toContain('на второй строке')
    // Номера реплик убраны
    expect(vtt).not.toMatch(/^\d+\s*$/m)
  })

  it('заменяет запятые на точки во всех временных метках строки', () => {
    const srt = '00:00:01,000 --> 00:00:04,500'

    expect(srtToVtt(srt)).toBe('WEBVTT\n\n00:00:01.000 --> 00:00:04.500\n')
  })

  it('нормализует Windows-переводы строк (\\r\\n) перед конвертацией', () => {
    const srt = '1\r\n00:00:01,000 --> 00:00:04,000\r\nText\r\n'

    expect(srtToVtt(srt)).toBe('WEBVTT\n\n00:00:01.000 --> 00:00:04.000\nText\n')
  })

  it('схлопывает три и более пустых строк подряд в одну пустую строку', () => {
    const srt = 'Line one\n\n\n\n\nLine two'

    const vtt = srtToVtt(srt)

    expect(vtt).not.toMatch(/\n{3,}/)
    expect(vtt).toContain('Line one')
    expect(vtt).toContain('Line two')
  })

  it('возвращает валидный WebVTT-заголовок для пустого файла', () => {
    expect(srtToVtt('')).toBe('WEBVTT\n\n\n')
  })

  it('возвращает валидный WebVTT для содержимого из одних пробелов', () => {
    expect(srtToVtt('   \n\n  ')).toBe('WEBVTT\n\n\n')
  })

  it('сохраняет спецсимволы и не экранирует HTML-подобные теги в тексте', () => {
    const srt = '1\n00:00:01,000 --> 00:00:04,000\n<i>Курсив</i> & "кавычки" — тире'

    const vtt = srtToVtt(srt)

    expect(vtt).toContain('<i>Курсив</i> & "кавычки" — тире')
  })

  it('не трогает строки с числами, которые не являются отдельным номером реплики', () => {
    const srt = '1\n00:00:01,000 --> 00:00:04,000\nВ 2026 году будет 100% готово'

    const vtt = srtToVtt(srt)

    expect(vtt).toContain('В 2026 году будет 100% готово')
  })
})
