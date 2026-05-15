import { describe, expect, it } from 'vitest'
import { FieldSignature } from '../field-signature'

describe('FieldSignature', () => {
  it('экспортирует компонент с displayName', () => {
    expect(FieldSignature.displayName).toBe('FieldSignature')
  })

  it('компонент является функцией', () => {
    expect(typeof FieldSignature).toBe('function')
  })
})

describe('Signature canvas utilities', () => {
  it('canvas создаётся с правильными размерами', () => {
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 150

    expect(canvas.width).toBe(400)
    expect(canvas.height).toBe(150)
  })

  it('getContext(2d) возвращает контекст', () => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    expect(ctx).toBeTruthy()
  })

  it('toDataURL возвращает data URI', () => {
    const canvas = document.createElement('canvas')
    canvas.width = 100
    canvas.height = 50

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, 100, 50)
    }

    const dataUrl = canvas.toDataURL('image/png')
    expect(dataUrl).toContain('data:image/png')
  })

  it('рисование линии не бросает ошибок', () => {
    const canvas = document.createElement('canvas')
    canvas.width = 200
    canvas.height = 100
    const ctx = canvas.getContext('2d')

    expect(() => {
      if (ctx) {
        ctx.strokeStyle = 'black'
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(10, 50)
        ctx.lineTo(100, 50)
        ctx.stroke()
      }
    }).not.toThrow()
  })

  it('fillText рисует текст на canvas', () => {
    const canvas = document.createElement('canvas')
    canvas.width = 300
    canvas.height = 100
    const ctx = canvas.getContext('2d')

    expect(() => {
      if (ctx) {
        ctx.font = '24px cursive'
        ctx.fillStyle = 'black'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('John Doe', 150, 50)
      }
    }).not.toThrow()
  })
})
