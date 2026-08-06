/**
 * React-компонент постера для анонса матча (satori).
 * Генерирует OG-image стиль карточку: команды, дата, стадион.
 */

import type { MatchData } from '../match-data'

interface AnnouncementPosterProps {
  match: MatchData
  cityName: string
}

/** Постер анонса матча (1200x630) */
export function AnnouncementPoster({ match, cityName }: AnnouncementPosterProps) {
  const homeTeam = match.homeTeam.team.name
  const awayTeam = match.awayTeam.team.name
  const isFriendly = match.matchType === 'FRIENDLY'
  const leagueName = match.league?.name ?? ''

  const dateStr = match.scheduledAt
    ? new Date(match.scheduledAt).toLocaleDateString('ru-RU', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Moscow',
    })
    : ''

  const venueName = match.venue?.name ?? ''

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        color: 'white',
        fontFamily: 'Inter, Noto Sans, sans-serif',
        padding: '40px 60px',
      }}
    >
      {/* Заголовок */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
          fontSize: '22px',
          color: '#e2b449',
          fontWeight: 700,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        {isFriendly ? '⚽ Товарищеский матч' : `🏆 КБС${leagueName ? ` • ${leagueName}` : ''}`}
      </div>

      {/* Команды — жёсткие ширины, satori не всегда корректно считает flex:1 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          marginBottom: '32px',
        }}
      >
        {/* Хозяева */}
        <div
          style={{
            display: 'flex',
            width: '440px',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '44px',
            fontWeight: 700,
            textAlign: 'center',
            lineHeight: 1.1,
            wordBreak: 'break-word',
          }}
        >
          {homeTeam}
        </div>

        {/* VS */}
        <div
          style={{
            display: 'flex',
            fontSize: '32px',
            fontWeight: 700,
            color: '#e2b449',
            padding: '10px 18px',
            border: '3px solid #e2b449',
            borderRadius: '14px',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          VS
        </div>

        {/* Гости */}
        <div
          style={{
            display: 'flex',
            width: '440px',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '44px',
            fontWeight: 700,
            textAlign: 'center',
            lineHeight: 1.1,
            wordBreak: 'break-word',
          }}
        >
          {awayTeam}
        </div>
      </div>

      {/* Дата и место */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          fontSize: '24px',
          color: 'rgba(255,255,255,0.8)',
        }}
      >
        {dateStr && <div style={{ display: 'flex' }}>📅 {dateStr}</div>}
        {venueName && <div style={{ display: 'flex' }}>📍 {venueName}</div>}
        {cityName && (
          <div style={{ display: 'flex', fontSize: '18px', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>
            {cityName}
          </div>
        )}
      </div>

      {/* Лого */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '30px',
          fontSize: '14px',
          color: 'rgba(255,255,255,0.3)',
        }}
      >
        grandslamcup.letar.best
      </div>
    </div>
  )
}
