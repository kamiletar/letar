'use client'

/**
 * Перекрёстная таблица (head-to-head matrix).
 * Показывает результаты всех матчей между командами лиги.
 */

import { Box, Text } from '@chakra-ui/react'
import Link from 'next/link'

interface MatchResult {
  id: string
  homeTeamId: string
  awayTeamId: string
  homeScore: number
  awayScore: number
}

interface TeamInfo {
  id: string
  name: string
  slug: string
}

interface CrossTableProps {
  teams: TeamInfo[]
  matches: MatchResult[]
  citySlug?: string
}

/**
 * Перекрёстная таблица — матрица результатов.
 * Строки = команда-хозяин, столбцы = команда-гость.
 */
export function CrossTable({ teams, matches, citySlug }: CrossTableProps) {
  if (teams.length === 0) {
    return null
  }

  // Индекс матчей: "homeId:awayId" → MatchResult
  const matchMap = new Map<string, MatchResult>()
  for (const m of matches) {
    matchMap.set(`${m.homeTeamId}:${m.awayTeamId}`, m)
  }

  const matchPrefix = citySlug ? `/${citySlug}/matches` : '/matches'

  return (
    <Box overflowX="auto" borderRadius="xl" borderWidth="1px" borderColor="border.muted">
      <Box minW={`${teams.length * 70 + 140}px`}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr>
              {/* Пустая ячейка — угол */}
              <th
                style={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 2,
                  padding: '8px 12px',
                  textAlign: 'left',
                  fontWeight: 'bold',
                  borderBottom: '2px solid var(--chakra-colors-border-muted)',
                  background: 'var(--chakra-colors-bg-panel)',
                }}
              >
                Команда
              </th>
              {teams.map((t) => (
                <th
                  key={t.id}
                  style={{
                    padding: '6px 4px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '11px',
                    borderBottom: '2px solid var(--chakra-colors-border-muted)',
                    maxWidth: '70px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={t.name}
                >
                  {/* Сокращённое имя (первые 3 буквы) */}
                  {t.name.length > 6 ? `${t.name.slice(0, 5)}…` : t.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teams.map((homeTeam, rowIdx) => (
              <tr key={homeTeam.id}>
                {/* Имя команды-строки */}
                <td
                  style={{
                    position: 'sticky',
                    left: 0,
                    zIndex: 1,
                    padding: '6px 12px',
                    fontWeight: 500,
                    borderBottom: '1px solid var(--chakra-colors-border-muted)',
                    background: rowIdx % 2 === 1 ? 'var(--chakra-colors-bg-subtle)' : 'var(--chakra-colors-bg-panel)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {homeTeam.name}
                </td>
                {teams.map((awayTeam) => {
                  // Диагональ
                  if (homeTeam.id === awayTeam.id) {
                    return (
                      <td
                        key={awayTeam.id}
                        style={{
                          padding: '6px 4px',
                          textAlign: 'center',
                          borderBottom: '1px solid var(--chakra-colors-border-muted)',
                          background: 'var(--chakra-colors-bg-muted)',
                        }}
                      >
                        <Text fontSize="xs" color="fg.subtle">
                          ×
                        </Text>
                      </td>
                    )
                  }

                  const match = matchMap.get(`${homeTeam.id}:${awayTeam.id}`)
                  if (!match) {
                    return (
                      <td
                        key={awayTeam.id}
                        style={{
                          padding: '6px 4px',
                          textAlign: 'center',
                          borderBottom: '1px solid var(--chakra-colors-border-muted)',
                          background: rowIdx % 2 === 1 ? 'var(--chakra-colors-bg-subtle)' : undefined,
                        }}
                      >
                        <Text fontSize="xs" color="fg.subtle">
                          —
                        </Text>
                      </td>
                    )
                  }

                  // Определяем результат для homeTeam
                  const isWin = match.homeScore > match.awayScore
                  const isDraw = match.homeScore === match.awayScore
                  const bgColor = isWin
                    ? 'var(--chakra-colors-green-subtle)'
                    : isDraw
                    ? 'var(--chakra-colors-gray-subtle)'
                    : 'var(--chakra-colors-red-subtle)'
                  const textColor = isWin
                    ? 'var(--chakra-colors-green-fg)'
                    : isDraw
                    ? 'var(--chakra-colors-fg-muted)'
                    : 'var(--chakra-colors-red-fg)'

                  return (
                    <td
                      key={awayTeam.id}
                      style={{
                        padding: '4px',
                        textAlign: 'center',
                        borderBottom: '1px solid var(--chakra-colors-border-muted)',
                        background: bgColor,
                      }}
                    >
                      <Link href={`${matchPrefix}/${match.id}`}>
                        <Text
                          fontSize="xs"
                          fontWeight="bold"
                          fontFamily="mono"
                          color={textColor}
                          _hover={{ textDecoration: 'underline' }}
                          lineHeight="tight"
                        >
                          {match.homeScore}:{match.awayScore}
                        </Text>
                      </Link>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
    </Box>
  )
}
