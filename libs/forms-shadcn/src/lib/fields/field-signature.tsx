'use client'

import { Eraser, Pen, Type } from 'lucide-react'
import type { ReactElement } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { cn } from '@letar/tailwind-utils'
import type { SignatureFieldProps, SignatureStroke, StrokePoint } from './types'

/** Экранирование XML спецсимволов (защита от инъекций в typed mode) */
export function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Построить SVG из массива штрихов (draw mode) */
export function buildSvgString(
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
      const d = `M${first.x.toFixed(1)},${first.y.toFixed(1)}`
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

/** Построить SVG из текстовой подписи (typed mode) */
export function buildTypedSvgString(
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
  if (typeof btoa === 'function') {
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
  }
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

function getCoords(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect()
  if ('touches' in e) {
    const touch = e.touches[0]
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
  }
  return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
}

interface SignatureFieldState {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  mode: 'draw' | 'typed'
  setMode: (mode: 'draw' | 'typed') => void
  typedText: string
  setTypedText: (text: string) => void
  isEmpty: boolean
  startDrawing: (e: React.MouseEvent | React.TouchEvent) => void
  draw: (e: React.MouseEvent | React.TouchEvent) => void
  stopDrawing: () => string
  clearCanvas: () => void
  renderTypedSignature: (text: string) => string
}

/**
 * Form.Field.Signature — shadcn-скин. Canvas-рисование мышью/пальцем + typed mode
 * (текстовый ввод курсивом). Значение — data URI (`image/png` или `image/svg+xml` base64).
 *
 * Портировано из Chakra-версии как есть (та же геометрия штрихов/SVG-сборка), заменена только
 * обвязка UI — не входит в UIKit-контракт (нет примитива для canvas), тот же принцип, что у
 * `Rating`/`Tags`/`ColorPicker`.
 */
export const FieldSignature = createField<SignatureFieldProps, string, SignatureFieldState>({
  displayName: 'FieldSignature',

  useFieldState: (props): SignatureFieldState => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const isDrawingRef = useRef(false)
    const [mode, setMode] = useState<'draw' | 'typed'>('draw')
    const [typedText, setTypedText] = useState('')
    const [isEmpty, setIsEmpty] = useState(true)

    const strokesRef = useRef<SignatureStroke[]>([])
    const currentPointsRef = useRef<StrokePoint[]>([])

    const strokeColor = props.strokeColor ?? 'black'
    const strokeWidth = props.strokeWidth ?? 2
    const backgroundColor = props.backgroundColor ?? 'white'
    const typedFont = props.typedFont ?? "'Segoe Script', 'Dancing Script', cursive"
    const exportFormat = props.exportFormat ?? 'png'
    const canvasWidth = props.width ?? 400
    const canvasHeight = props.height ?? 150

    const initCanvas = useCallback(() => {
      const canvas = canvasRef.current
      if (!canvas) { return }
      const ctx = canvas.getContext('2d')
      if (!ctx) { return }
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }, [backgroundColor])

    useEffect(() => {
      initCanvas()
    }, [initCanvas])

    const startDrawing = useCallback(
      (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current
        if (!canvas) { return }
        if ('touches' in e) { e.preventDefault() }
        const ctx = canvas.getContext('2d')
        if (!ctx) { return }

        isDrawingRef.current = true
        const { x, y } = getCoords(e, canvas)
        currentPointsRef.current = [{ x, y }]

        ctx.strokeStyle = strokeColor
        ctx.lineWidth = strokeWidth
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        ctx.moveTo(x, y)
      },
      [strokeColor, strokeWidth],
    )

    const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawingRef.current) { return }
      const canvas = canvasRef.current
      if (!canvas) { return }
      if ('touches' in e) { e.preventDefault() }
      const ctx = canvas.getContext('2d')
      if (!ctx) { return }

      const { x, y } = getCoords(e, canvas)
      currentPointsRef.current.push({ x, y })
      ctx.lineTo(x, y)
      ctx.stroke()
    }, [])

    const stopDrawing = useCallback((): string => {
      isDrawingRef.current = false
      const canvas = canvasRef.current
      if (!canvas) { return '' }

      if (currentPointsRef.current.length > 0) {
        strokesRef.current.push({ points: [...currentPointsRef.current] })
        currentPointsRef.current = []
      }

      setIsEmpty(false)

      if (exportFormat === 'svg') {
        return svgToDataUri(
          buildSvgString(strokesRef.current, canvasWidth, canvasHeight, strokeColor, strokeWidth, backgroundColor),
        )
      }
      return canvas.toDataURL('image/png')
    }, [exportFormat, canvasWidth, canvasHeight, strokeColor, strokeWidth, backgroundColor])

    const clearCanvas = useCallback(() => {
      initCanvas()
      strokesRef.current = []
      currentPointsRef.current = []
      setIsEmpty(true)
      setTypedText('')
    }, [initCanvas])

    const renderTypedSignature = useCallback(
      (text: string): string => {
        const canvas = canvasRef.current
        if (!canvas) { return '' }
        const ctx = canvas.getContext('2d')
        if (!ctx) { return '' }

        ctx.fillStyle = backgroundColor
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        if (!text.trim()) {
          setIsEmpty(true)
          return ''
        }

        const fontSize = Math.min(canvas.height * 0.4, 48)
        ctx.font = `${fontSize}px ${typedFont}`
        ctx.fillStyle = strokeColor
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(text, canvas.width / 2, canvas.height / 2)

        setIsEmpty(false)

        if (exportFormat === 'svg') {
          return svgToDataUri(
            buildTypedSvgString(text, canvasWidth, canvasHeight, strokeColor, backgroundColor, typedFont),
          )
        }
        return canvas.toDataURL('image/png')
      },
      [backgroundColor, strokeColor, typedFont, exportFormat, canvasWidth, canvasHeight],
    )

    return {
      canvasRef,
      mode,
      setMode,
      typedText,
      setTypedText,
      isEmpty,
      startDrawing,
      draw,
      stopDrawing,
      clearCanvas,
      renderTypedSignature,
    }
  },

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    const { width = 400, height = 150, clearLabel = 'Очистить', allowTyped = true } = componentProps
    const placeholder = resolved.placeholder ?? 'Подпишите здесь'
    const {
      canvasRef,
      mode,
      setMode,
      typedText,
      setTypedText,
      isEmpty,
      startDrawing,
      draw,
      stopDrawing,
      clearCanvas,
      renderTypedSignature,
    } = fieldState
    const isDisabled = resolved.disabled

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        <div
          data-field-name={fullPath}
          className={cn(
            'border-input relative overflow-hidden rounded-md border',
            isDisabled && 'pointer-events-none opacity-50',
          )}
          style={{ maxWidth: `${width}px` }}
        >
          {allowTyped && (
            <div className="border-input flex gap-1 border-b p-2">
              <button
                type="button"
                onClick={() => {
                  setMode('draw')
                  clearCanvas()
                  field.handleChange('')
                }}
                className={cn(
                  'inline-flex items-center gap-1 rounded px-2 py-1 text-xs',
                  mode === 'draw' ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground',
                )}
              >
                <Pen className="size-3" />
                Рисовать
              </button>
              <button
                type="button"
                onClick={() => setMode('typed')}
                className={cn(
                  'inline-flex items-center gap-1 rounded px-2 py-1 text-xs',
                  mode === 'typed' ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground',
                )}
              >
                <Type className="size-3" />
                Ввести текст
              </button>
            </div>
          )}

          {mode === 'typed' && (
            <div className="border-input border-b p-2">
              <input
                value={typedText}
                onChange={(e) => {
                  const text = e.target.value
                  setTypedText(text)
                  const dataUrl = renderTypedSignature(text)
                  field.handleChange(dataUrl || '')
                }}
                placeholder="Введите ваше имя..."
                className="w-full bg-transparent text-lg italic outline-none"
                style={{ fontFamily: 'cursive' }}
              />
            </div>
          )}

          <div className="relative">
            <canvas
              ref={canvasRef}
              width={width}
              height={height}
              role="img"
              aria-label="Область подписи"
              tabIndex={0}
              style={{
                display: 'block',
                maxWidth: '100%',
                cursor: mode === 'draw' ? 'crosshair' : 'default',
                touchAction: 'none',
              }}
              onMouseDown={mode === 'draw' ? startDrawing : undefined}
              onMouseMove={mode === 'draw' ? draw : undefined}
              onMouseUp={mode === 'draw'
                ? () => {
                  const dataUrl = stopDrawing()
                  if (dataUrl) { field.handleChange(dataUrl) }
                }
                : undefined}
              onMouseLeave={mode === 'draw'
                ? () => {
                  const dataUrl = stopDrawing()
                  if (dataUrl) { field.handleChange(dataUrl) }
                }
                : undefined}
              onTouchStart={mode === 'draw' ? startDrawing : undefined}
              onTouchMove={mode === 'draw' ? draw : undefined}
              onTouchEnd={mode === 'draw'
                ? () => {
                  const dataUrl = stopDrawing()
                  if (dataUrl) { field.handleChange(dataUrl) }
                }
                : undefined}
            />

            {isEmpty && mode === 'draw' && (
              <div className="text-muted-foreground pointer-events-none absolute inset-0 flex items-center justify-center text-sm">
                {placeholder}
              </div>
            )}
          </div>

          {!isEmpty && (
            <div className="border-input flex justify-end border-t p-2">
              <button
                type="button"
                onClick={() => {
                  clearCanvas()
                  field.handleChange('')
                }}
                className="text-destructive inline-flex items-center gap-1 rounded px-2 py-1 text-xs hover:underline"
              >
                <Eraser className="size-3" />
                {clearLabel}
              </button>
            </div>
          )}
        </div>
      </FieldWrapper>
    )
  },
})
