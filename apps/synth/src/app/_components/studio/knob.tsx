'use client'

import { Box, Portal, Text, Tooltip } from '@chakra-ui/react'
import { useCallback, useRef } from 'react'

interface KnobProps {
  value: number // нормализованная 0–1
  onChange: (v: number) => void
  label: string
  hint?: string
  size?: number
  displayValue?: string // текст под кнобом; если не задан — показываем %
}

// Угол от вертикали (12 ч) для значения v ∈ [0,1].
// Диапазон: -135° (7 ч) → +135° (5 ч) = 270° полного хода.
function valueToAngle(v: number): number {
  return (-135 + v * 270) * (Math.PI / 180)
}

// Точка на окружности r от центра (cx,cy), угол θ от 12 ч (по часовой).
function circlePoint(cx: number, cy: number, r: number, θ: number) {
  return { x: cx + r * Math.sin(θ), y: cy - r * Math.cos(θ) }
}

// SVG-дуга от значения from до to по часовой.
function arcPath(cx: number, cy: number, r: number, from: number, to: number): string {
  const s = circlePoint(cx, cy, r, valueToAngle(from))
  const e = circlePoint(cx, cy, r, valueToAngle(to))
  // большая дуга нужна при разнице > 180°
  const large = to - from > 0.666 ? 1 : 0
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`
}

export function Knob({ value, onChange, label, hint, size = 52, displayValue }: KnobProps) {
  const cx = size / 2
  const cy = size / 2
  const trackR = size * 0.38
  const dotR = size * 0.055

  const dragging = useRef(false)
  const startY = useRef(0)
  const startVal = useRef(0)

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      dragging.current = true
      startY.current = e.clientY
      startVal.current = value
    },
    [value]
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) {
        return
      }
      // 150px вертикального хода = полный диапазон
      const delta = (startY.current - e.clientY) / 150
      onChange(Math.max(0, Math.min(1, startVal.current + delta)))
    },
    [onChange]
  )

  const onPointerUp = useCallback(() => {
    dragging.current = false
  }, [])

  const dot = circlePoint(cx, cy, trackR, valueToAngle(value))
  const display = displayValue ?? `${Math.round(value * 100)}%`

  const inner = (
    <Box
      display="flex"
      flexDir="column"
      alignItems="center"
      gap="2px"
      userSelect="none"
      cursor="ns-resize"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      _hover={{ '& circle:last-child': { fill: '#EEC835' } }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
        {/* Подложка */}
        <circle cx={cx} cy={cy} r={trackR + 3} fill="#0E0C08" stroke="#2A2018" strokeWidth={1} />

        {/* Трек (весь диапазон) */}
        <path d={arcPath(cx, cy, trackR, 0, 1)} fill="none" stroke="#382E28" strokeWidth={2.5} strokeLinecap="round" />

        {/* Заполненная дуга (золото) */}
        {value > 0.005 && (
          <path
            d={arcPath(cx, cy, trackR, 0, value)}
            fill="none"
            stroke="#D4AF37"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        )}

        {/* Индикатор положения */}
        <circle cx={dot.x} cy={dot.y} r={dotR} fill="#EEC835" />
      </svg>

      <Text fontSize="9px" color="fg.subtle" letterSpacing="0.06em" lineHeight={1} textTransform="uppercase">
        {label}
      </Text>
      <Text fontSize="9px" color="fg.gold" letterSpacing="0.05em" lineHeight={1}>
        {display}
      </Text>
    </Box>
  )

  if (!hint) {
    return inner
  }

  return (
    <Tooltip.Root openDelay={400} closeDelay={0}>
      <Tooltip.Trigger asChild>{inner}</Tooltip.Trigger>
      <Portal>
        <Tooltip.Positioner>
          <Tooltip.Content
            bg="#1A1200"
            color="#F5F0E8"
            fontSize="xs"
            maxW="220px"
            border="1px solid #D4AF37"
            px={3}
            py={2}
            borderRadius="md"
            lineHeight="1.4"
          >
            {hint}
          </Tooltip.Content>
        </Tooltip.Positioner>
      </Portal>
    </Tooltip.Root>
  )
}
