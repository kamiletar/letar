/**
 * React-компонент постера расписания на неделю (satori).
 * Тёмный градиент, матчи сгруппированы по дням.
 */

interface ScheduleMatch {
  homeTeam: string
  awayTeam: string
  time: string
  venue: string
  isFriendly: boolean
}

interface ScheduleDay {
  date: string
  matches: ScheduleMatch[]
}

interface SchedulePosterProps {
  cityName: string
  days: ScheduleDay[]
  /** Количество матчей, не поместившихся на постер */
  hiddenCount: number
}

/** Постер расписания на неделю (1200x630) */
export function SchedulePoster({ cityName, days, hiddenCount }: SchedulePosterProps) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        color: 'white',
        fontFamily: 'Inter, Noto Sans, sans-serif',
        padding: '36px 48px',
      }}
    >
      {/* Заголовок */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px',
          fontSize: '28px',
          color: '#e2b449',
          fontWeight: 700,
          letterSpacing: '0.03em',
          textTransform: 'uppercase',
        }}
      >
        📅 Матчи недели | {cityName}
      </div>

      {/* Дни */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
        {days.map((day) => (
          <div key={day.date} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* Дата */}
            <div
              style={{
                display: 'flex',
                fontSize: '18px',
                fontWeight: 700,
                color: '#e2b449',
                borderBottom: '1px solid rgba(226,180,73,0.3)',
                paddingBottom: '4px',
              }}
            >
              {day.date}
            </div>

            {/* Матчи дня */}
            {day.matches.map((m, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  fontSize: '20px',
                  padding: '4px 0',
                }}
              >
                <div style={{ display: 'flex', flex: 1, fontWeight: 600 }}>
                  {m.homeTeam} — {m.awayTeam}
                  {m.isFriendly && (
                    <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginLeft: '8px' }}>⚽</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '16px', color: 'rgba(255,255,255,0.7)' }}>
                  {m.time && <span>{m.time}</span>}
                  {m.venue && <span>📍 {m.venue}</span>}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Скрытые матчи */}
      {hiddenCount > 0 && (
        <div style={{ display: 'flex', fontSize: '16px', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>
          и ещё {hiddenCount} {hiddenCount === 1 ? 'матч' : hiddenCount < 5 ? 'матча' : 'матчей'}
        </div>
      )}

      {/* Водяной знак */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          right: '24px',
          fontSize: '14px',
          color: 'rgba(255,255,255,0.3)',
        }}
      >
        grandslamcup.letar.best
      </div>
    </div>
  )
}
