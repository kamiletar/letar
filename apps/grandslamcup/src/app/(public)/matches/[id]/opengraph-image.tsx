/**
 * Динамическая OG-карточка матча для Telegram/VK
 *
 * Генерируется на сервере: счёт, команды, MVP, стадион.
 * 1200x630 — стандартный размер для OG.
 *
 * ПРИМЕЧАНИЕ: Хардкод цветов (#1a1a1a, #fff, #FF0000 и др.) — ограничение next/og.
 * ImageResponse рендерит через Satori (не DOM), CSS variables и semantic tokens не поддерживаются.
 */

import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/format-date'
import { getDisplayStatus, matchStatusLabels } from '@/lib/match-status'
import { MATCH_TEAMS_NAME } from '@/lib/prisma-includes'
import { findMatchMVP } from '@/lib/scoring'
import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Результат матча — Grand Slam Cup'

type Params = Promise<{ id: string }>

export default async function MatchOGImage({ params }: { params: Params }) {
  const { id } = await params

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      ...MATCH_TEAMS_NAME,
      venue: { select: { name: true } },
      tour: {
        include: {
          round: { include: { season: { select: { name: true } } } },
        },
      },
      performances: {
        where: { totalScore: { not: null } },
        include: { player: { select: { name: true } } },
      },
    },
  })

  if (!match) {
    return new ImageResponse(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1a1a',
          color: '#fff',
          fontSize: 48,
        }}
      >
        Матч не найден
      </div>,
      { ...size },
    )
  }

  const homeTeam = match.homeTeam.team.name
  const awayTeam = match.awayTeam.team.name
  const displayStatus = getDisplayStatus(match)
  const isFinished = displayStatus === 'FINISHED'
  const statusLabel = matchStatusLabels[displayStatus].toUpperCase()

  // MVP матча
  const mvp = isFinished
    ? findMatchMVP(
      match.performances.map((p) => ({
        playerName: p.player.name,
        totalScore: p.totalScore,
      })),
    )
    : null

  const dateStr = match.scheduledAt ? formatDate(match.scheduledAt) : ''

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0a0a0a',
        color: '#fff',
        padding: '48px 64px',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Заголовок */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <span style={{ color: '#FF0000', fontSize: 28, fontWeight: 700 }}>Grand Slam Cup</span>
        <span style={{ color: '#888', fontSize: 20 }}>{match.tour?.round.season.name ?? 'Товарищеский матч'}</span>
      </div>

      {/* Счёт — основной блок */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 48,
        }}
      >
        {/* Хозяева */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            flex: 1,
          }}
        >
          <span
            style={{
              fontSize: 36,
              fontWeight: 700,
              textAlign: 'center',
              lineHeight: 1.2,
            }}
          >
            {homeTeam}
          </span>
        </div>

        {/* Счёт */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {isFinished
            ? (
              <span
                style={{
                  fontSize: 96,
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  letterSpacing: '0.05em',
                }}
              >
                {match.homeScore} : {match.awayScore}
              </span>
            )
            : <span style={{ fontSize: 64, color: '#666' }}>vs</span>}
          <span
            style={{
              fontSize: 18,
              color: isFinished ? '#4ade80' : '#3b82f6',
              marginTop: 8,
              fontWeight: 600,
            }}
          >
            {statusLabel}
          </span>
        </div>

        {/* Гости */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            flex: 1,
          }}
        >
          <span
            style={{
              fontSize: 36,
              fontWeight: 700,
              textAlign: 'center',
              lineHeight: 1.2,
            }}
          >
            {awayTeam}
          </span>
        </div>
      </div>

      {/* Нижняя строка: MVP + стадион + дата */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginTop: 24,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {mvp && (
            <span style={{ fontSize: 20, color: '#facc15' }}>
              MVP: {mvp.playerName} ({mvp.totalScore} б.)
            </span>
          )}
          {match.venue && <span style={{ fontSize: 18, color: '#666' }}>{match.venue.name}</span>}
        </div>
        <span style={{ fontSize: 18, color: '#666' }}>{dateStr}</span>
      </div>
    </div>,
    { ...size },
  )
}
