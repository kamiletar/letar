const W = 560
const H = 180
const PAD = { top: 24, right: 16, bottom: 36, left: 0 }
const CHART_W = W - PAD.left - PAD.right
const CHART_H = H - PAD.top - PAD.bottom

const DEFAULT_COLOR = 'var(--chakra-colors-green-500, #48BB78)'
const LABEL_COLOR = 'var(--chakra-colors-fg-muted, #718096)'

export interface BarChartDatum {
  /** Уникальный ключ столбика (месяц и т.п.) */
  key: string
  /** Подпись под столбиком */
  label: string
  /** Основное значение — определяет высоту столбика и максимум шкалы */
  value: number
  /**
   * Значение накладки поверх основного столбика (например billable-часть общего времени).
   * Учитывается только при заданном `backgroundColor`
   */
  overlayValue?: number
}

export interface BarChartProps {
  data: BarChartDatum[]
  /** `aria-label` корневого `<svg>` */
  ariaLabel: string
  /** Форматирование значения для подписи над столбиком */
  formatValue: (value: number) => string
  /** Цвет столбика (single-layer) или накладки (двухслойный режим) */
  color?: string
  /**
   * Цвет фонового столбика (`value`) при двухслойном режиме. Без него столбик рисуется одним
   * слоем цветом `color`
   */
  backgroundColor?: string
  /** Подпись максимума шкалы сверху слева (не рендерится без этого пропа) */
  formatMaxLabel?: (max: number) => string
}

/** Серверный SVG bar-chart без зависимостей: общая геометрия для одно- и двухслойных графиков. */
export function BarChart(
  { data, ariaLabel, formatValue, color = DEFAULT_COLOR, backgroundColor, formatMaxLabel }: BarChartProps,
) {
  const max = Math.max(...data.map((d) => d.value), 1)
  const count = data.length
  const slotW = CHART_W / count
  const barW = Math.max(8, slotW - 12)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} aria-label={ariaLabel} role="img">
      {/* Горизонтальные линии */}
      {[0.25, 0.5, 0.75, 1].map((ratio) => {
        const y = PAD.top + CHART_H - ratio * CHART_H
        return (
          <line
            key={ratio}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y}
            y2={y}
            stroke="currentColor"
            strokeOpacity={0.08}
            strokeWidth={1}
          />
        )
      })}

      {/* Столбики и подписи */}
      {data.map((d, i) => {
        const barH = Math.max(d.value > 0 ? 4 : 0, (d.value / max) * CHART_H)
        const x = PAD.left + i * slotW + (slotW - barW) / 2
        const y = PAD.top + CHART_H - barH
        const overlayH = backgroundColor !== undefined ? Math.max(0, ((d.overlayValue ?? 0) / max) * CHART_H) : 0
        const yOverlay = PAD.top + CHART_H - overlayH

        return (
          <g key={d.key}>
            {/* Основной столбик (либо единственный слой, либо фон под накладкой) */}
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={3}
              style={{ fill: backgroundColor ?? color }}
              fillOpacity={backgroundColor !== undefined ? 0.4 : 0.85}
            />

            {/* Накладка поверх — только в двухслойном режиме */}
            {backgroundColor !== undefined && overlayH > 0 && (
              <rect
                x={x}
                y={yOverlay}
                width={barW}
                height={overlayH}
                rx={3}
                style={{ fill: color }}
                fillOpacity={0.85}
              />
            )}

            {/* Значение над столбиком */}
            {d.value > 0 && (
              <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize={9} style={{ fill: LABEL_COLOR }}>
                {formatValue(d.value)}
              </text>
            )}

            {/* Подпись под столбиком */}
            <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize={11} style={{ fill: LABEL_COLOR }}>
              {d.label}
            </text>
          </g>
        )
      })}

      {/* Подпись максимума шкалы */}
      {formatMaxLabel && max > 1 && (
        <text x={PAD.left + 2} y={PAD.top - 6} fontSize={9} style={{ fill: LABEL_COLOR }}>
          {formatMaxLabel(max)}
        </text>
      )}
    </svg>
  )
}
