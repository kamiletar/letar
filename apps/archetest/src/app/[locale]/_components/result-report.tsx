'use client'

import { useIsHydrated } from '@letar/hooks'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { EXPERIMENTAL_SCALES, type ScaleCode } from '../_data/personality-types'
import { buildResultReport, type ResultReportInput, type ResultReportRow } from '../_lib/result-report'
import './result-report.css'

interface ResultReportProps extends Omit<ResultReportInput, 'locale'> {
  id: string
  source: 'session' | 'cumulative'
  subject?: string
  /** Экспериментальный блок — только для кабинета, в прежних границах доступа. */
  experimentalScores?: Partial<Record<ScaleCode, number>> | null
  experimentalCounts?: Partial<Record<ScaleCode, number>> | null
}

/** Полный отчёт лежит вне экранных контейнеров: их overflow и скрытые вкладки не обрезают PDF. */
export function ResultReport(
  { id, source, subject, experimentalScores, experimentalCounts, ...input }: ResultReportProps,
) {
  const locale = useLocale()
  const t = useTranslations('resultReport')
  const hydrated = useIsHydrated()
  const [createdAt] = useState(() => new Date())
  if (!hydrated) {
    return null
  }
  const rows = buildResultReport({ ...input, locale })
  const percent = (value: number | null) =>
    value === null ? t('noData') : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)}%`
  const isRu = locale === 'ru'
  return createPortal(
    <article id={id} data-result-report="" className="result-report" lang={locale}>
      <div className="report-cover">
        <p className="report-brand">ARCHETEST · {t('source.' + source)}</p>
        <h1>{t('title')}</h1>
        {subject && <p className="report-subject">{subject}</p>}
        <p>{t('created', { date: new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(createdAt) })}</p>
        <p>{t('meaning')}</p>
        <p>{t('limits')}</p>
        <ReportRadar rows={rows} title={t('radar')} />
        <p className="report-note">{t('radarNote')}</p>
      </div>

      <section className="report-table-section">
        <h2>{t('tableTitle')}</h2>
        <p>{t('countsNote')}</p>
        <table>
          <thead>
            <tr>
              <th>{t('code')}</th>
              <th>{t('scale')}</th>
              <th>{t('score')}</th>
              <th>{t('answered')}</th>
              <th>{t('coverage')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.code}>
                <td>{row.code}</td>
                <td>{row.label}{row.clinical && <small>{row.clinical}</small>}</td>
                <td>{percent(row.score)}</td>
                <td>{row.answered ?? t('unknown')}</td>
                <td>{row.confidence ? t(`confidence.${row.confidence}`) : t('unknown')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="report-details">
        <h2>{t('detailsTitle')}</h2>
        <p>{t('recommendationsNote')}</p>
        {rows.map((row) => (
          <section key={row.code} className="report-scale" data-report-scale={row.code}>
            <h3>{row.code} · {row.label} — {percent(row.score)}{row.beta ? ` · ${t('beta')}` : ''}</h3>
            {row.clinical && <p className="report-note">{row.clinical}</p>}
            <p>{row.description}</p>
            {row.score === null
              ? <p className="report-note">{t('noInterpretation')}</p>
              : (
                <>
                  {row.whenHigh && (
                    <p>
                      <strong>{t('context')}</strong>
                      {row.whenHigh}
                    </p>
                  )}
                  <h4>{t('practices')}</h4>
                  <ul>{row.practices.map((practice) => <li key={practice}>{practice}</li>)}</ul>
                </>
              )}
          </section>
        ))}
      </section>

      {experimentalScores && (
        <section className="report-experimental">
          <h2>{t('experimentalTitle')}</h2>
          <p>{t('experimentalNote')}</p>
          {EXPERIMENTAL_SCALES.map((scale) => {
            const count = experimentalCounts?.[scale.code] ?? 0
            const value = experimentalScores[scale.code]
            const score = count > 0 && value !== undefined && Number.isFinite(value) && value >= 0 && value <= 100
              ? value
              : null
            return (
              <section key={scale.code} className="report-scale">
                <h3>{scale.code} · {isRu ? scale.label : scale.labelEn} — {percent(score)} · {t('beta')}</h3>
                <p>{isRu ? scale.description : scale.descriptionEn}</p>
                <p>{t('answered')}: {count}</p>
                {score === null && <p>{t('noInterpretation')}</p>}
              </section>
            )
          })}
        </section>
      )}
      <footer>{t('limits')} · archetest.letar.best</footer>
    </article>,
    document.body,
  )
}

/** Фиксированный SVG для бумаги: не зависит от ширины скрытого ResponsiveContainer. */
function ReportRadar({ rows, title }: { rows: ResultReportRow[]; title: string }) {
  const center = 210
  const radius = 160
  const point = (index: number, value: number) => {
    const angle = (index / rows.length) * Math.PI * 2 - Math.PI / 2
    return { x: center + Math.cos(angle) * radius * value / 100, y: center + Math.sin(angle) * radius * value / 100 }
  }
  return (
    <svg viewBox="0 0 420 420" role="img" aria-label={title} className="report-radar">
      <title>{title}</title>
      {[25, 50, 75, 100].map((value) => (
        <g key={value}>
          <circle cx={center} cy={center} r={radius * value / 100} className="report-grid" />
          <text x={center + 4} y={center - radius * value / 100 + 12} className="report-ring-label">{value}%</text>
        </g>
      ))}
      {rows.map((row, i) => {
        const end = point(i, 100)
        const label = point(i, 116)
        const current = point(i, row.score ?? 0)
        const nextRow = rows[(i + 1) % rows.length]
        const next = point(i + 1, nextRow.score ?? 0)
        return (
          <g key={row.code}>
            <line x1={center} y1={center} x2={end.x} y2={end.y} className="report-grid" />
            <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="central" className="report-axis">
              {row.code}
            </text>
            {row.score !== null && (
              <>
                {nextRow.score !== null && (
                  <line x1={current.x} y1={current.y} x2={next.x} y2={next.y} className="report-value" />
                )}
                <circle cx={current.x} cy={current.y} r={3} className="report-dot" />
              </>
            )}
          </g>
        )
      })}
    </svg>
  )
}
