'use client'

import { Box, Button, Field, HStack, Input, SegmentGroup } from '@chakra-ui/react'
import { type ReactElement, type RefObject, useCallback, useEffect, useRef, useState } from 'react'
import { LuEraser, LuPen, LuType } from 'react-icons/lu'
import type { FieldTooltipMeta } from '../../types'
import { createField, FieldError, FieldLabel } from '../base'

/**
 * Props для поля цифровой подписи
 */
export interface SignatureFieldProps {
  /** Имя поля */
  name?: string
  /** Лейбл */
  label?: string
  /** Подсказка */
  helperText?: string
  /** Обязательное */
  required?: boolean
  /** Отключено */
  disabled?: boolean
  /** Tooltip */
  tooltip?: FieldTooltipMeta

  /** Ширина canvas (по умолчанию: 400) */
  width?: number
  /** Высота canvas (по умолчанию: 150) */
  height?: number
  /** Цвет линии (по умолчанию: черный) */
  strokeColor?: string
  /** Толщина линии (по умолчанию: 2) */
  strokeWidth?: number
  /** Фон canvas (по умолчанию: белый) */
  backgroundColor?: string
  /** Текст кнопки очистки (по умолчанию: 'Clear') */
  clearLabel?: string
  /** Placeholder поверх пустого canvas */
  placeholder?: string
  /** Разрешить typed mode (по умолчанию: true) */
  allowTyped?: boolean
  /** Шрифт для typed mode (по умолчанию: cursive) */
  typedFont?: string
  /** Формат экспорта: 'png' (data URI base64) или 'svg' (SVG data URI). По умолчанию: 'png' */
  exportFormat?: 'png' | 'svg'
}

interface SignatureState {
  canvasRef: RefObject<HTMLCanvasElement | null>
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

/** Точка штриха подписи */
interface StrokePoint {
  x: number
  y: number
}

/** Один штрих (от mousedown до mouseup) */
export interface SignatureStroke {
  points: StrokePoint[]
}

/**
 * Экранирование XML спецсимволов (защита от инъекций в typed mode)
 */
export function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * Построить SVG из массива штрихов (draw mode)
 */
export function buildSvgString(
  strokes: SignatureStroke[],
  width: number,
  height: number,
  strokeColor: string,
  strokeWidth: number,
  backgroundColor: string
): string {
  const paths = strokes
    .filter((s) => s.points.length > 0)
    .map((stroke) => {
      const [first, ...rest] = stroke.points
      const d =
        `M${first.x.toFixed(1)},${first.y.toFixed(1)}` +
        rest.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('')
      return `<path d="${d}" fill="none" stroke="${escapeXml(
        strokeColor
      )}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`
    })
    .join('\n  ')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${escapeXml(backgroundColor)}"/>
  ${paths}
</svg>`
}

/**
 * Построить SVG из текстовой подписи (typed mode)
 */
export function buildTypedSvgString(
  text: string,
  width: number,
  height: number,
  strokeColor: string,
  backgroundColor: string,
  typedFont: string
): string {
  const fontSize = Math.min(height * 0.4, 48)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${escapeXml(backgroundColor)}"/>
  <text x="${width / 2}" y="${height / 2}" text-anchor="middle" dominant-baseline="central" font-family="${escapeXml(
    typedFont
  )}" font-size="${fontSize}" fill="${escapeXml(strokeColor)}">${escapeXml(text)}</text>
</svg>`
}

/**
 * Конвертировать SVG строку в data URI (base64)
 */
function svgToDataUri(svg: string): string {
  if (typeof btoa === 'function') {
    // Браузер
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
  }
  // Node.js (SSR fallback)
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

/**
 * Получить координаты из mouse или touch event
 */
function getCoords(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect()
  if ('touches' in e) {
    const touch = e.touches[0]
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
  }
  return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
}

/**
 * Form.Field.Signature — поле цифровой подписи.
 *
 * Canvas-рисование мышью и пальцем + typed mode (ввод текста курсивом).
 * Значение: data URI строка (image/png base64).
 *
 * @example Draw mode
 * ```tsx
 * <Form.Field.Signature name="signature" label="Your Signature" />
 * ```
 *
 * @example С настройками
 * ```tsx
 * <Form.Field.Signature
 *   name="signature"
 *   width={500}
 *   height={200}
 *   strokeColor="#1a365d"
 *   strokeWidth={3}
 *   clearLabel="Очистить"
 *   placeholder="Подпишите здесь"
 * />
 * ```
 */
export const FieldSignature = createField<SignatureFieldProps, string, SignatureState>({
  displayName: 'FieldSignature',

  useFieldState: (props) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const isDrawingRef = useRef(false)
    const [mode, setMode] = useState<'draw' | 'typed'>('draw')
    const [typedText, setTypedText] = useState('')
    const [isEmpty, setIsEmpty] = useState(true)

    // SVG export: запись штрихов (refs — без ре-рендеров при рисовании)
    const strokesRef = useRef<SignatureStroke[]>([])
    const currentPointsRef = useRef<StrokePoint[]>([])

    const strokeColor = props.strokeColor ?? 'black'
    const strokeWidth = props.strokeWidth ?? 2
    const backgroundColor = props.backgroundColor ?? 'white'
    const typedFont = props.typedFont ?? "'Segoe Script', 'Dancing Script', cursive"
    const exportFormat = props.exportFormat ?? 'png'
    const canvasWidth = props.width ?? 400
    const canvasHeight = props.height ?? 150

    // Инициализация canvas фоном
    const initCanvas = useCallback(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }, [backgroundColor])

    // Инициализация при монтировании
    useEffect(() => {
      initCanvas()
    }, [initCanvas])

    // Начать рисование
    const startDrawing = useCallback(
      (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current
        if (!canvas) return

        // Предотвращаем scroll на touch
        if ('touches' in e) e.preventDefault()

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        isDrawingRef.current = true
        const { x, y } = getCoords(e, canvas)

        // Запись координат для SVG export
        currentPointsRef.current = [{ x, y }]

        ctx.strokeStyle = strokeColor
        ctx.lineWidth = strokeWidth
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        ctx.moveTo(x, y)
      },
      [strokeColor, strokeWidth]
    )

    // Рисовать
    const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawingRef.current) return
      const canvas = canvasRef.current
      if (!canvas) return

      if ('touches' in e) e.preventDefault()

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const { x, y } = getCoords(e, canvas)
      currentPointsRef.current.push({ x, y })
      ctx.lineTo(x, y)
      ctx.stroke()
    }, [])

    // Остановить рисование, вернуть data URI
    const stopDrawing = useCallback((): string => {
      isDrawingRef.current = false
      const canvas = canvasRef.current
      if (!canvas) return ''

      // Сохранить штрих для SVG
      if (currentPointsRef.current.length > 0) {
        strokesRef.current.push({ points: [...currentPointsRef.current] })
        currentPointsRef.current = []
      }

      setIsEmpty(false)

      if (exportFormat === 'svg') {
        return svgToDataUri(
          buildSvgString(strokesRef.current, canvasWidth, canvasHeight, strokeColor, strokeWidth, backgroundColor)
        )
      }
      return canvas.toDataURL('image/png')
    }, [exportFormat, canvasWidth, canvasHeight, strokeColor, strokeWidth, backgroundColor])

    // Очистить canvas
    const clearCanvas = useCallback(() => {
      initCanvas()
      strokesRef.current = []
      currentPointsRef.current = []
      setIsEmpty(true)
      setTypedText('')
    }, [initCanvas])

    // Отрисовать typed подпись на canvas
    const renderTypedSignature = useCallback(
      (text: string): string => {
        const canvas = canvasRef.current
        if (!canvas) return ''
        const ctx = canvas.getContext('2d')
        if (!ctx) return ''

        // Очистить и нарисовать текст курсивом
        ctx.fillStyle = backgroundColor
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        if (!text.trim()) {
          setIsEmpty(true)
          return ''
        }

        // Адаптивный размер шрифта
        const fontSize = Math.min(canvas.height * 0.4, 48)
        ctx.font = `${fontSize}px ${typedFont}`
        ctx.fillStyle = strokeColor
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(text, canvas.width / 2, canvas.height / 2)

        setIsEmpty(false)

        if (exportFormat === 'svg') {
          return svgToDataUri(
            buildTypedSvgString(text, canvasWidth, canvasHeight, strokeColor, backgroundColor, typedFont)
          )
        }
        return canvas.toDataURL('image/png')
      },
      [backgroundColor, strokeColor, typedFont, exportFormat, canvasWidth, canvasHeight]
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

  render: ({ field, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    const { width = 400, height = 150, clearLabel = 'Clear', allowTyped = true } = componentProps
    const placeholder = resolved.placeholder ?? 'Sign here'

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
      <Field.Root invalid={hasError} required={resolved.required} disabled={isDisabled}>
        <FieldLabel label={resolved.label} tooltip={resolved.tooltip} required={resolved.required} />

        <Box
          position="relative"
          borderWidth="1px"
          borderColor={hasError ? 'border.error' : 'border'}
          borderRadius="md"
          overflow="hidden"
          maxW={`${width}px`}
          opacity={isDisabled ? 0.5 : 1}
          pointerEvents={isDisabled ? 'none' : 'auto'}
        >
          {/* Переключатель режимов */}
          {allowTyped && (
            <HStack p={2} borderBottomWidth="1px" borderColor="border" gap={2}>
              <SegmentGroup.Root
                size="xs"
                value={mode}
                onValueChange={(details) => {
                  const newMode = details.value as 'draw' | 'typed'
                  setMode(newMode)
                  // При переключении на draw — очистить canvas
                  if (newMode === 'draw') {
                    clearCanvas()
                    field.handleChange('')
                  }
                }}
              >
                <SegmentGroup.Item value="draw">
                  <SegmentGroup.ItemText>
                    <LuPen /> Draw
                  </SegmentGroup.ItemText>
                  <SegmentGroup.ItemHiddenInput />
                </SegmentGroup.Item>
                <SegmentGroup.Item value="typed">
                  <SegmentGroup.ItemText>
                    <LuType /> Type
                  </SegmentGroup.ItemText>
                  <SegmentGroup.ItemHiddenInput />
                </SegmentGroup.Item>
              </SegmentGroup.Root>
            </HStack>
          )}

          {/* Typed mode — текстовый ввод */}
          {mode === 'typed' && (
            <Box p={2} borderBottomWidth="1px" borderColor="border">
              <Input
                placeholder="Type your name..."
                value={typedText}
                onChange={(e) => {
                  const text = e.target.value
                  setTypedText(text)
                  const dataUrl = renderTypedSignature(text)
                  field.handleChange(dataUrl || '')
                }}
                fontFamily="cursive"
                fontSize="lg"
              />
            </Box>
          )}

          {/* Canvas */}
          <Box position="relative">
            <canvas
              ref={canvasRef}
              width={width}
              height={height}
              style={{
                display: 'block',
                maxWidth: '100%',
                cursor: mode === 'draw' ? 'crosshair' : 'default',
                touchAction: 'none', // Отключить scroll при рисовании
              }}
              role="img"
              aria-label="Signature pad"
              tabIndex={0}
              onMouseDown={mode === 'draw' ? startDrawing : undefined}
              onMouseMove={mode === 'draw' ? draw : undefined}
              onMouseUp={
                mode === 'draw'
                  ? () => {
                      const dataUrl = stopDrawing()
                      if (dataUrl) field.handleChange(dataUrl)
                    }
                  : undefined
              }
              onMouseLeave={
                mode === 'draw'
                  ? () => {
                      const dataUrl = stopDrawing()
                      if (dataUrl) field.handleChange(dataUrl)
                    }
                  : undefined
              }
              onTouchStart={mode === 'draw' ? startDrawing : undefined}
              onTouchMove={mode === 'draw' ? draw : undefined}
              onTouchEnd={
                mode === 'draw'
                  ? () => {
                      const dataUrl = stopDrawing()
                      if (dataUrl) field.handleChange(dataUrl)
                    }
                  : undefined
              }
            />

            {/* Placeholder */}
            {isEmpty && mode === 'draw' && (
              <Box
                position="absolute"
                inset={0}
                display="flex"
                alignItems="center"
                justifyContent="center"
                pointerEvents="none"
                color="fg.subtle"
                fontSize="sm"
              >
                {placeholder}
              </Box>
            )}
          </Box>

          {/* Кнопка очистки */}
          {!isEmpty && (
            <HStack p={2} borderTopWidth="1px" borderColor="border" justifyContent="flex-end">
              <Button
                size="xs"
                variant="ghost"
                colorPalette="red"
                onClick={() => {
                  clearCanvas()
                  field.handleChange('')
                }}
              >
                <LuEraser />
                {clearLabel}
              </Button>
            </HStack>
          )}
        </Box>

        <FieldError hasError={hasError} errorMessage={errorMessage} helperText={resolved.helperText} />
      </Field.Root>
    )
  },
})
