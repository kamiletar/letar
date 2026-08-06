import { describe, expect, it } from 'vitest'
import { buildSvgString, buildTypedSvgString, escapeXml, type SignatureStroke } from '../field-signature'

describe('escapeXml', () => {
  it('экранирует амперсанд', () => {
    expect(escapeXml('a&b')).toBe('a&amp;b')
  })

  it('экранирует угловые скобки и кавычки', () => {
    expect(escapeXml('<script>"alert"</script>')).toBe('&lt;script&gt;&quot;alert&quot;&lt;/script&gt;')
  })

  it('не меняет обычный текст', () => {
    expect(escapeXml('John Doe')).toBe('John Doe')
  })
})

describe('buildSvgString', () => {
  it('создаёт SVG с path-элементами из штрихов', () => {
    const strokes: SignatureStroke[] = [
      {
        points: [
          { x: 10, y: 20 },
          { x: 30, y: 40 },
          { x: 50, y: 60 },
        ],
      },
      {
        points: [
          { x: 100, y: 100 },
          { x: 200, y: 200 },
        ],
      },
    ]
    const svg = buildSvgString(strokes, 400, 150, 'black', 2, 'white')

    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(svg).toContain('width="400"')
    expect(svg).toContain('height="150"')
    expect(svg).toContain('<rect')
    expect(svg).toContain('fill="white"')
    // Два штриха — два path
    const pathCount = (svg.match(/<path /g) ?? []).length
    expect(pathCount).toBe(2)
    // Первый path содержит M и L
    expect(svg).toContain('M10.0,20.0')
    expect(svg).toContain('L30.0,40.0')
  })

  it('пустые штрихи — SVG с фоном без path', () => {
    const svg = buildSvgString([], 400, 150, 'black', 2, 'white')

    expect(svg).toContain('<rect')
    expect(svg).not.toContain('<path')
  })

  it('фильтрует штрихи без точек', () => {
    const strokes: SignatureStroke[] = [
      { points: [] },
      {
        points: [
          { x: 10, y: 10 },
          { x: 20, y: 20 },
        ],
      },
    ]
    const svg = buildSvgString(strokes, 400, 150, 'black', 2, 'white')

    const pathCount = (svg.match(/<path /g) ?? []).length
    expect(pathCount).toBe(1)
  })

  it('экранирует цвет штриха для защиты от инъекций', () => {
    const svg = buildSvgString(
      [
        {
          points: [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
          ],
        },
      ],
      100,
      50,
      '"><script>alert(1)</script>',
      2,
      'white',
    )
    expect(svg).not.toContain('<script>')
    expect(svg).toContain('&lt;script&gt;')
  })
})

describe('buildTypedSvgString', () => {
  it('создаёт SVG с text-элементом', () => {
    const svg = buildTypedSvgString('John Doe', 400, 150, 'black', 'white', 'cursive')

    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(svg).toContain('<text')
    expect(svg).toContain('>John Doe</text>')
    expect(svg).toContain('text-anchor="middle"')
    expect(svg).toContain('font-family="cursive"')
  })

  it('экранирует текст для защиты от XSS', () => {
    const svg = buildTypedSvgString('<script>alert(1)</script>', 400, 150, 'black', 'white', 'cursive')

    expect(svg).not.toContain('<script>')
    expect(svg).toContain('&lt;script&gt;')
  })

  it('вычисляет адаптивный размер шрифта', () => {
    // height=150, 0.4*150=60, min(60, 48) = 48
    const svg = buildTypedSvgString('Test', 400, 150, 'black', 'white', 'cursive')
    expect(svg).toContain('font-size="48"')

    // height=50, 0.4*50=20, min(20, 48) = 20
    const svgSmall = buildTypedSvgString('Test', 400, 50, 'black', 'white', 'cursive')
    expect(svgSmall).toContain('font-size="20"')
  })
})
