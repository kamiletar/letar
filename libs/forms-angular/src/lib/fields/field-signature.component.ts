import { type AfterViewInit, Component, type ElementRef, Input, signal, ViewChild } from '@angular/core'
import type { FormControl } from '@angular/forms'
import { FieldBase } from '../core/field-base'

interface StrokePoint {
  x: number
  y: number
}
interface SignatureStroke {
  points: StrokePoint[]
}

const TYPED_FONT = "'Segoe Script', 'Dancing Script', cursive"

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

function getCoords(event: MouseEvent | TouchEvent, canvas: HTMLCanvasElement): StrokePoint {
  const rect = canvas.getBoundingClientRect()
  if ('touches' in event) {
    const touch = event.touches[0]!
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
  }
  return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}

/**
 * Canvas-подпись — Angular-эквивалент `FieldSignature` (`@letar/forms-vue`, `field-signature.ts` +
 * `use-signature-field.ts`): рисование мышью/тачем + typed-режим (курсивный текст), экспорт в
 * PNG (`canvas.toDataURL`) или SVG data URI по записанным штрихам. Значение — `string` (data URI).
 *
 * `@ViewChild('canvasEl')` + `ngAfterViewInit` для инициализации 2D-контекста — тот же паттерн,
 * что `DocumentFieldBase`/`FieldSignature` в Vue: canvas требует прямого DOM-доступа, не
 * декларативного биндинга. Чистые функции экспорта (`buildSvgString`/`buildTypedSvgString`/
 * `escapeXml`/`getCoords`) — 1:1 порт из `use-signature-field.ts`, framework-agnostic по своей
 * природе, но не вынесены в `forms-core` — единственный потребитель этой пары полей во всех
 * скинах.
 *
 * ⚠️ В jsdom (vitest) `canvas.getContext('2d')` обычно возвращает `null` (canvas не реализован без
 * отдельного нативного пакета) — все методы, работающие с контекстом, начинаются с ранней
 * проверки `if (!canvas || !ctx) return` и безопасно no-op в тестовом окружении. Тест этого поля
 * поэтому ограничен регистрацией контрола и базовым рендером, не рисованием (см. `PLAN.md`
 * задание Stage G).
 */
@Component({
  selector: 'letar-field-signature',
  standalone: true,
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field" [attr.data-field-name]="name">
        @if (resolvedLabel()) {
          <span class="letar-field__label">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</span>
        }
        <div class="letar-field__signature" [style.maxWidth.px]="width">
          @if (allowTyped) {
            <div class="letar-field__signature-toolbar">
              <button type="button" [attr.aria-pressed]="mode() === 'draw'" (click)="setMode('draw', ctrl)">
                Рисовать
              </button>
              <button type="button" [attr.aria-pressed]="mode() === 'typed'" (click)="setMode('typed', ctrl)">
                Ввести текст
              </button>
            </div>
          }
          @if (mode() === 'typed') {
            <input
              type="text"
              class="letar-field__signature-typed-input"
              placeholder="Введите имя..."
              [value]="typedText()"
              style="font-family:cursive;font-size:1.125rem"
              (input)="onTypedInput($event, ctrl)"
            />
          }
          <div style="position: relative">
            <canvas
              #canvasEl
              [width]="width"
              [height]="height"
              role="img"
              aria-label="Поле подписи"
              tabindex="0"
              [attr.data-field-name]="name"
              [style.cursor]="mode() === 'draw' ? 'crosshair' : 'default'"
              style="display:block;max-width:100%;touch-action:none"
              (mousedown)="startDrawing($event)"
              (mousemove)="draw($event)"
              (mouseup)="stopDrawing(ctrl)"
              (mouseleave)="stopDrawing(ctrl)"
              (touchstart)="startDrawing($event)"
              (touchmove)="draw($event)"
              (touchend)="stopDrawing(ctrl)"
              (blur)="ctrl.markAsTouched()"
            ></canvas>
            @if (isEmpty() && mode() === 'draw') {
              <div class="letar-field__signature-placeholder">{{ placeholder }}</div>
            }
          </div>
          @if (!isEmpty()) {
            <div class="letar-field__signature-actions">
              <button type="button" (click)="clear(ctrl)">{{ clearLabel }}</button>
            </div>
          }
        </div>
        @if (hasError()) {
          <span class="letar-field__error" role="alert">{{ errorMessage() }}</span>
        }
      </div>
    }
  `,
})
export class FieldSignatureComponent extends FieldBase implements AfterViewInit {
  @Input()
  width = 400
  @Input()
  height = 150
  @Input()
  strokeColor = 'black'
  @Input()
  strokeWidth = 2
  @Input()
  backgroundColor = 'white'
  @Input()
  clearLabel = 'Очистить'
  @Input()
  override placeholder = 'Подпишите здесь'
  @Input()
  allowTyped = true
  @Input()
  exportFormat: 'png' | 'svg' = 'png'

  @ViewChild('canvasEl')
  private readonly canvasRef?: ElementRef<HTMLCanvasElement>

  readonly mode = signal<'draw' | 'typed'>('draw')
  readonly typedText = signal('')
  readonly isEmpty = signal(true)

  private isDrawing = false
  private strokes: SignatureStroke[] = []
  private currentPoints: StrokePoint[] = []

  ngAfterViewInit(): void {
    this.initCanvas()
  }

  private initCanvas(): void {
    const canvas = this.canvasRef?.nativeElement
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) {
      return
    }
    ctx.fillStyle = this.backgroundColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  protected startDrawing(event: MouseEvent | TouchEvent): void {
    if (this.mode() !== 'draw') {
      return
    }
    const canvas = this.canvasRef?.nativeElement
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) {
      return
    }
    if ('touches' in event) {
      event.preventDefault()
    }
    this.isDrawing = true
    const { x, y } = getCoords(event, canvas)
    this.currentPoints = [{ x, y }]
    ctx.strokeStyle = this.strokeColor
    ctx.lineWidth = this.strokeWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  protected draw(event: MouseEvent | TouchEvent): void {
    if (!this.isDrawing) {
      return
    }
    const canvas = this.canvasRef?.nativeElement
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) {
      return
    }
    if ('touches' in event) {
      event.preventDefault()
    }
    const { x, y } = getCoords(event, canvas)
    this.currentPoints.push({ x, y })
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  protected stopDrawing(ctrl: FormControl): void {
    if (!this.isDrawing) {
      return
    }
    this.isDrawing = false
    const canvas = this.canvasRef?.nativeElement
    if (!canvas) {
      return
    }
    if (this.currentPoints.length > 0) {
      this.strokes.push({ points: [...this.currentPoints] })
      this.currentPoints = []
    }
    this.isEmpty.set(false)

    const dataUrl = this.exportFormat === 'svg'
      ? svgToDataUri(
        buildSvgString(this.strokes, this.width, this.height, this.strokeColor, this.strokeWidth, this.backgroundColor),
      )
      : canvas.toDataURL('image/png')
    ctrl.setValue(dataUrl)
  }

  protected clear(ctrl: FormControl): void {
    this.initCanvas()
    this.strokes = []
    this.currentPoints = []
    this.isEmpty.set(true)
    this.typedText.set('')
    ctrl.setValue('')
  }

  protected setMode(next: 'draw' | 'typed', ctrl: FormControl): void {
    this.mode.set(next)
    if (next === 'draw') {
      this.clear(ctrl)
    }
  }

  protected onTypedInput(event: Event, ctrl: FormControl): void {
    const text = (event.target as HTMLInputElement).value
    this.typedText.set(text)
    const canvas = this.canvasRef?.nativeElement
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) {
      return
    }
    ctx.fillStyle = this.backgroundColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    if (!text.trim()) {
      this.isEmpty.set(true)
      ctrl.setValue('')
      return
    }

    const fontSize = Math.min(canvas.height * 0.4, 48)
    ctx.font = `${fontSize}px ${TYPED_FONT}`
    ctx.fillStyle = this.strokeColor
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)
    this.isEmpty.set(false)

    const dataUrl = this.exportFormat === 'svg'
      ? svgToDataUri(
        buildTypedSvgString(text, this.width, this.height, this.strokeColor, this.backgroundColor, TYPED_FONT),
      )
      : canvas.toDataURL('image/png')
    ctrl.setValue(dataUrl)
  }
}
