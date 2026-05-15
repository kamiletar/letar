/**
 * Протокол матча — print-friendly страница
 *
 * Ctrl+P / кнопка "Печать" → PDF через браузер.
 * Чёрно-белый, без навигации, оптимизирован для печати A4.
 *
 * ПРИМЕЧАНИЕ: Хардкод цветов (#000, #f5f5f5, #333, #eee) — print-only стили.
 * Semantic tokens не работают в @media print, поэтому используются фиксированные значения.
 */

import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/format-date'
import { findMatchMVP } from '@/lib/scoring'
import { redirect } from 'next/navigation'
import { PrintButton } from './_components/print-button'

type Params = Promise<{ id: string }>

export default async function ProtocolPage({ params }: { params: Params }) {
  const { id: matchId } = await params

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: {
        include: {
          team: { select: { name: true } },
          lineups: {
            where: { matchId },
            include: { player: { select: { name: true } } },
          },
        },
      },
      awayTeam: {
        include: {
          team: { select: { name: true } },
          lineups: {
            where: { matchId },
            include: { player: { select: { name: true } } },
          },
        },
      },
      venue: { select: { name: true } },
      tour: {
        include: {
          round: { include: { season: { select: { name: true } } } },
        },
      },
      performances: {
        include: { player: { select: { name: true } } },
        orderBy: [{ half: 'asc' }, { roundNumber: 'asc' }],
      },
    },
  })

  if (!match) {
    redirect('/')
  }

  const mvp = findMatchMVP(match.performances)
  const date = formatDate(match.scheduledAt)

  // Группировка перформансов по таймам
  const half1 = match.performances.filter((p) => p.half === 1)
  const half2 = match.performances.filter((p) => p.half === 2)

  return (
    <div style={{ fontFamily: 'serif', maxWidth: '800px', margin: '0 auto', padding: '20px', color: '#000' }}>
      {/* Стили для печати */}
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          table { page-break-inside: avoid; }
        }
        @media screen {
          body { background: #f5f5f5; }
        }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        th, td { border: 1px solid #333; padding: 6px 8px; text-align: center; font-size: 13px; }
        th { background: #eee; font-weight: bold; }
        td.name { text-align: left; }
        h1, h2, h3 { margin: 8px 0; }
      `}</style>

      {/* Кнопка печати (не печатается) */}
      <div className="no-print" style={{ marginBottom: '20px', textAlign: 'center' }}>
        <PrintButton />
      </div>

      {/* Заголовок */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px' }}>ПРОТОКОЛ МАТЧА</h1>
        <p style={{ fontSize: '14px', color: '#555' }}>
          {match.tour?.round.season.name ?? 'Товарищеский'} ·{' '}
          {match.tour ? `Круг ${match.tour.round.number} · Тур ${match.tour.number}` : 'матч'}
        </p>
        <p style={{ fontSize: '14px', color: '#555' }}>
          {date} · {match.venue?.name ?? '—'}
        </p>
      </div>

      {/* Счёт */}
      <div style={{ textAlign: 'center', margin: '20px 0' }}>
        <h2 style={{ fontSize: '24px' }}>
          {match.homeTeam.team.name} {match.homeScore ?? 0} : {match.awayScore ?? 0} {match.awayTeam.team.name}
        </h2>
        {mvp && (
          <p style={{ fontSize: '14px' }}>
            MVP: <strong>{mvp.player.name}</strong> ({mvp.totalScore} баллов)
          </p>
        )}
      </div>

      {/* 1-й тайм */}
      {half1.length > 0 && (
        <>
          <h3>1-й тайм</h3>
          <PerformanceTable performances={half1} homeTeamId={match.homeTeam.id} />
        </>
      )}

      {/* 2-й тайм */}
      {half2.length > 0 && (
        <>
          <h3>2-й тайм</h3>
          <PerformanceTable performances={half2} homeTeamId={match.homeTeam.id} />
        </>
      )}

      {/* Составы */}
      <div style={{ display: 'flex', gap: '20px', marginTop: '24px' }}>
        <div style={{ flex: 1 }}>
          <h3>{match.homeTeam.team.name}</h3>
          <ol style={{ fontSize: '13px', paddingLeft: '20px' }}>
            {match.homeTeam.lineups.map((l) => (
              <li key={l.id}>{l.player.name}</li>
            ))}
          </ol>
        </div>
        <div style={{ flex: 1 }}>
          <h3>{match.awayTeam.team.name}</h3>
          <ol style={{ fontSize: '13px', paddingLeft: '20px' }}>
            {match.awayTeam.lineups.map((l) => (
              <li key={l.id}>{l.player.name}</li>
            ))}
          </ol>
        </div>
      </div>

      {/* Подписи */}
      <div style={{ marginTop: '40px', display: 'flex', gap: '40px' }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '13px', borderBottom: '1px solid #333', paddingBottom: '30px' }}>
            Скорер: __________________
          </p>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '13px', borderBottom: '1px solid #333', paddingBottom: '30px' }}>
            Ведущий: __________________
          </p>
        </div>
      </div>
    </div>
  )
}

function PerformanceTable({
  performances,
  homeTeamId,
}: {
  performances: Array<{
    id: string
    roundNumber: number
    teamSeasonId: string
    player: { name: string }
    textAdjusted: number | null
    deliveryAdjusted: number | null
    totalScore: number | null
  }>
  homeTeamId: string
}) {
  // Группировка по раундам
  const rounds = new Map<number, typeof performances>()
  for (const p of performances) {
    const list = rounds.get(p.roundNumber) ?? []
    list.push(p)
    rounds.set(p.roundNumber, list)
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Раунд</th>
          <th>Поэт</th>
          <th>Команда</th>
          <th>Текст</th>
          <th>Подача</th>
          <th>Итого</th>
        </tr>
      </thead>
      <tbody>
        {[...rounds.entries()].map(([round, perfs]) =>
          perfs.map((p, i) => (
            <tr key={p.id}>
              {i === 0 && <td rowSpan={perfs.length}>{round}</td>}
              <td className="name">{p.player.name}</td>
              <td>{p.teamSeasonId === homeTeamId ? 'Д' : 'Г'}</td>
              <td>{p.textAdjusted ?? '—'}</td>
              <td>{p.deliveryAdjusted ?? '—'}</td>
              <td>
                <strong>{p.totalScore ?? '—'}</strong>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}
