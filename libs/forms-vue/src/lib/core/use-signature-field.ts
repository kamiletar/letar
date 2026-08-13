import { onMounted, type Ref, ref } from 'vue'

export interface UseSignatureFieldOptions {
  width?: number
  height?: number
  strokeColor?: string
  strokeWidth?: number
  backgroundColor?: string
  typedFont?: string
  exportFormat?: 'png' | 'svg'
  onChange: (dataUrl: string) => void
}

export interface UseSignatureFieldResult {
  canvasRef: Ref<HTMLCanvasElement | null>
  mode: Ref<'draw' | 'typed'>
  typedText: Ref<string>
  isEmpty: Ref<boolean>
  setMode: (mode: 'draw' | 'typed') => void
  handleTypedInput: (text: string) => void
  startDrawing: (e: MouseEvent | TouchEvent) => void
  draw: (e: MouseEvent | TouchEvent) => void
  stopDrawing: () => void
  clear: () => void
}

interface StrokePoint {
  x: number
  y: number
}
interface SignatureStroke {
  points: StrokePoint[]
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildSvgString(
  strokes: SignatureStroke[],
  width: number,
  height: number,
  strokeColor: string,
  strokeWidth: number,
  backgroundColor: string,
): string {
  const paths = strokes
    .filter((s) => s.points.length > 0)
    .map((stroke) => {
      const [first, ...rest] = stroke.points
      const d = `M${first!.x.toFixed(1)},${first!.y.toFixed(1)}`
        + rest.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('')
      return `<path d="${d}" fill="none" stroke="${
        escapeXml(strokeColor)
      }" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`
    })
    .join('\n  ')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${escapeXml(backgroundColor)}"/>
  ${paths}
</svg>`
}

function buildTypedSvgString(
  text: string,
  width: number,
  height: number,
  strokeColor: string,
  backgroundColor: string,
  typedFont: string,
): string {
  const fontSize = Math.min(height * 0.4, 48)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${escapeXml(backgroundColor)}"/>
  <text x="${width / 2}" y="${height / 2}" text-anchor="middle" dominant-baseline="central" font-family="${
    escapeXml(typedFont)
  }" font-size="${fontSize}" fill="${escapeXml(strokeColor)}">${escapeXml(text)}</text>
</svg>`
}

function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
}

function getCoords(e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement): StrokePoint {
  const rect = canvas.getBoundingClientRect()
  if ('touches' in e) {
    const touch = e.touches[0]!
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
  }
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

/**
 * Composable Canvas-подписи — общий для headless и Reka-скина. Порт React `field-signature.tsx`
 * (`useFieldState`): рисование мышью/пальцем + typed-режим (курсивный текст), экспорт в
 * PNG (`canvas.toDataURL`) или SVG data URI по записанным штрихам. Чистые функции экспорта
 * (`buildSvgString`/`buildTypedSvgString`/`escapeXml`) — 1:1 порт, framework-agnostic по своей
 * природе (не вынесены в `forms-core` — единственный потребитель этой пары Vue-полей).
 */
export function useSignatureField(options: UseSignatureFieldOptions): UseSignatureFieldResult {
  const width = options.width ?? 400
  const height = options.height ?? 150
  const strokeColor = options.strokeColor ?? 'black'
  const strokeWidth = options.strokeWidth ?? 2
  const backgroundColor = options.backgroundColor ?? 'white'
  const typedFont = options.typedFont ?? "'Segoe Script', 'Dancing Script', cursive"
  const exportFormat = options.exportFormat ?? 'png'

  const canvasRef = ref<HTMLCanvasElement | null>(null)
  const mode = ref<'draw' | 'typed'>('draw')
  const typedText = ref('')
  const isEmpty = ref(true)

  let isDrawing = false
  let strokes: SignatureStroke[] = []
  let currentPoints: StrokePoint[] = []

  function initCanvas() {
    const canvas = canvasRef.value
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) {
      return
    }
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  onMounted(initCanvas)

  function startDrawing(e: MouseEvent | TouchEvent) {
    const canvas = canvasRef.value
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) {
      return
    }
    if ('touches' in e) {
      e.preventDefault()
    }
    isDrawing = true
    const { x, y } = getCoords(e, canvas)
    currentPoints = [{ x, y }]
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = strokeWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function draw(e: MouseEvent | TouchEvent) {
    if (!isDrawing) {
      return
    }
    const canvas = canvasRef.value
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) {
      return
    }
    if ('touches' in e) {
      e.preventDefault()
    }
    const { x, y } = getCoords(e, canvas)
    currentPoints.push({ x, y })
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  function stopDrawing() {
    isDrawing = false
    const canvas = canvasRef.value
    if (!canvas) {
      return
    }
    if (currentPoints.length > 0) {
      strokes.push({ points: [...currentPoints] })
      currentPoints = []
    }
    isEmpty.value = false

    const dataUrl = exportFormat === 'svg'
      ? svgToDataUri(buildSvgString(strokes, width, height, strokeColor, strokeWidth, backgroundColor))
      : canvas.toDataURL('image/png')
    options.onChange(dataUrl)
  }

  function clear() {
    initCanvas()
    strokes = []
    currentPoints = []
    isEmpty.value = true
    typedText.value = ''
    options.onChange('')
  }

  function setMode(next: 'draw' | 'typed') {
    mode.value = next
    if (next === 'draw') {
      clear()
    }
  }

  function handleTypedInput(text: string) {
    typedText.value = text
    const canvas = canvasRef.value
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) {
      return
    }
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    if (!text.trim()) {
      isEmpty.value = true
      options.onChange('')
      return
    }

    const fontSize = Math.min(canvas.height * 0.4, 48)
    ctx.font = `${fontSize}px ${typedFont}`
    ctx.fillStyle = strokeColor
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)
    isEmpty.value = false

    const dataUrl = exportFormat === 'svg'
      ? svgToDataUri(buildTypedSvgString(text, width, height, strokeColor, backgroundColor, typedFont))
      : canvas.toDataURL('image/png')
    options.onChange(dataUrl)
  }

  return { canvasRef, mode, typedText, isEmpty, setMode, handleTypedInput, startDrawing, draw, stopDrawing, clear }
}
