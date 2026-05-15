/**
 * React-компонент постера для результата матча (satori).
 * Генерирует карточку итогов: счёт, MVP, карточки.
 */

import type { MatchData } from '../match-data'

interface ResultPosterProps {
  match: MatchData
  cityName: string
}

/** Постер результата матча (1200x630) */
export function ResultPoster({ match, cityName }: ResultPosterProps) {
  const homeTeam = match.homeTeam.team.name
  const awayTeam = match.awayTeam.team.name
  const isFriendly = match.matchType === 'FRIENDLY'

  // Определяем MVP (лучший балл за выступление)
  const mvp = match.performances.reduce<{ name: string; score: number } | null>((best, p) => {
    const score = p.totalScore ?? 0
    if (!best || score > best.score) {
      return { name: p.player.name, score }
    }
    return best
  }, null)

  // Цвет результа��а
  const homeWon = (match.homeScore ?? 0) > (match.awayScore ?? 0)
  const awayWon = (match.awayScore ?? 0) > (match.homeScore ?? 0)
  const isDraw = (match.homeScore ?? 0) === (match.awayScore ?? 0)

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #0a1628 0%, #1a1a3e 50%, #2d1b69 100%)',
        color: 'white',
        fontFamily: 'Inter, Noto Sans, sans-serif',
        padding: '40px 60px',
      }}
    >
      {/* Заголовок */}
      <div
        style={{
          display: 'flex',
          fontSize: '20px',
          color: '#e2b449',
          fontWeight: 700,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          marginBottom: '24px',
        }}
      >
        {isFriendly ? '⚽ Результат товарищеского матча' : '🏆 Результат матча КБС'}
      </div>

      {/* Счёт — жёсткие ширины, satori не всегда корректно считает flex:1 */}
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
            flexDirection: 'column',
            width: '460px',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: '32px',
              fontWeight: 700,
              textAlign: 'center',
              marginBottom: '8px',
              color: homeWon ? '#4ade80' : isDraw ? 'white' : 'rgba(255,255,255,0.6)',
              lineHeight: 1.1,
              wordBreak: 'break-word',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
            }}
          >
            {homeTeam}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '80px',
              fontWeight: 700,
              color: homeWon ? '#4ade80' : 'white',
              lineHeight: 1,
            }}
          >
            {match.homeScore ?? 0}
          </div>
        </div>

        {/* Разделитель */}
        <div
          style={{
            display: 'flex',
            fontSize: '48px',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.3)',
            alignItems: 'center',
          }}
        >
          :
        </div>

        {/* Гости */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '460px',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: '32px',
              fontWeight: 700,
              textAlign: 'center',
              marginBottom: '8px',
              color: awayWon ? '#4ade80' : isDraw ? 'white' : 'rgba(255,255,255,0.6)',
              lineHeight: 1.1,
              wordBreak: 'break-word',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
            }}
          >
            {awayTeam}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '80px',
              fontWeight: 700,
              color: awayWon ? '#4ade80' : 'white',
              lineHeight: 1,
            }}
          >
            {match.awayScore ?? 0}
          </div>
        </div>
      </div>

      {/* MVP */}
      {mvp && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '24px',
            color: '#e2b449',
            marginBottom: '8px',
          }}
        >
          ⭐ MVP: {mvp.name} ({mvp.score} баллов)
        </div>
      )}

      {/* Город */}
      {cityName && (
        <div
          style={{
            display: 'flex',
            fontSize: '16px',
            color: 'rgba(255,255,255,0.4)',
            marginTop: '16px',
          }}
        >
          {cityName}
        </div>
      )}

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
