/**
 * Единая таблица рейтинга поэтов с рангами, медалями и визуальными акцентами.
 * Zebra striping, hover, brand-подсветка топ-3.
 *
 * @param showDetailedStats — показывать расширенные колонки (Всего, Лучш.)
 * @param citySlug — slug города для ссылок вида /{citySlug}/players/{slug}
 */

import { DataTableWrapper } from '@/app/_components/data-table-wrapper'
import { type SocialLink, SocialLinks } from '@/app/_components/social-links'
import { TableHeader } from '@/app/_components/stat-tooltip'
import { Box, Flex, Grid, Text } from '@chakra-ui/react'
import Link from 'next/link'

export interface PlayerStat {
  name: string
  slug: string
  currentTeam: string | null
  matchesPlayed: number
  avgScore: number
  avgText: number
  avgDelivery: number
  /** Лучший балл за одно выступление (нужен при showDetailedStats) */
  bestScore: number
  /** Суммарный балл за все выступления (нужен при showDetailedStats) */
  totalScore: number
  socialLinks?: SocialLink[] | null
}

/** Медали для топ-3 */
const MEDALS = ['🥇', '🥈', '🥉']

/** Базовые колонки (7 шт.) — глобальная версия */
const BASE_HEADERS = [
  { label: '#', tooltip: 'Позиция в рейтинге' },
  { label: 'Поэт' },
  { label: 'Команда' },
  { label: 'Выст.', tooltip: 'Выступлений (мин. 3)' },
  { label: 'Средн.', tooltip: 'Средний балл за выступление' },
  { label: 'Текст', tooltip: 'Средний балл за текст' },
  { label: 'Подача', tooltip: 'Средний балл за подачу' },
]

/** Расширенные колонки (9 шт.) — версия с детальной статистикой */
const DETAILED_HEADERS = [
  { label: '#', tooltip: 'Позиция в рейтинге' },
  { label: 'Поэт' },
  { label: 'Команда' },
  { label: 'Выст.', tooltip: 'Выступлений (мин. 3)' },
  { label: 'Всего', tooltip: 'Суммарный балл за все выступления' },
  { label: 'Средн.', tooltip: 'Средний балл за выступление' },
  { label: 'Лучш.', tooltip: 'Лучший балл за одно выступление' },
  { label: 'Текст', tooltip: 'Средний балл за текст' },
  { label: 'Подача', tooltip: 'Средний балл за подачу' },
]

/** Grid-шаблон для базовой версии (7 колонок) */
const BASE_TEMPLATE = '44px 1fr 1fr 56px 64px 56px 56px'
/** Grid-шаблон для расширенной версии (9 колонок) */
const DETAILED_TEMPLATE = '44px 1fr 1fr 56px 72px 64px 56px 56px 56px'

interface PlayerRatingTableProps {
  players: PlayerStat[]
  /** Slug города для ссылок вида /{citySlug}/players/{slug} */
  citySlug?: string
  /** Показывать расширенные колонки: Всего и Лучш. (по умолчанию false) */
  showDetailedStats?: boolean
}

export function PlayerRatingTable({ players, citySlug, showDetailedStats = false }: PlayerRatingTableProps) {
  if (players.length === 0) {
    return <Text color="fg.muted">Нет данных о выступлениях</Text>
  }

  const headers = showDetailedStats ? DETAILED_HEADERS : BASE_HEADERS
  const templateColumns = showDetailedStats ? DETAILED_TEMPLATE : BASE_TEMPLATE
  const minW = showDetailedStats ? '680px' : '560px'

  return (
    <DataTableWrapper>
      <Grid templateColumns={templateColumns} gap={0} fontSize="sm" minW={minW}>
        {/* Заголовок */}
        {headers.map((h) => (
          <Box
            key={h.label}
            px={3}
            py={2.5}
            fontWeight="bold"
            fontSize="xs"
            textTransform="uppercase"
            letterSpacing="wide"
            bg={{ base: 'gray.100', _dark: 'brand.950' }}
            color={{ base: 'fg.muted', _dark: 'gray.300' }}
            borderBottomWidth="2px"
            borderBottomColor="brand.solid"
          >
            {h.tooltip ? <TableHeader label={h.label} tooltip={h.tooltip} /> : h.label}
          </Box>
        ))}

        {/* Данные */}
        {players.map((p, i) => {
          const rank = i + 1
          const isTop3 = rank <= 3
          const medal = MEDALS[i]
          const playerHref = citySlug ? `/${citySlug}/players/${p.slug}` : `/players/${p.slug}`

          return (
            <Box
              key={p.slug}
              display="contents"
              css={{
                '& > *': {
                  transition: 'background 0.15s',
                },
                '&:hover > *': {
                  background: 'var(--chakra-colors-brand-50)',
                },
                '.dark &:hover > *, [data-theme="dark"] &:hover > *': {
                  background: 'rgba(255,0,0,0.08)',
                },
              }}
            >
              {/* Позиция */}
              <Box
                px={3}
                py={2.5}
                borderBottomWidth="1px"
                borderBottomColor="border.muted"
                display="flex"
                alignItems="center"
                bg={i % 2 === 1 ? 'bg.subtle' : undefined}
                borderLeftWidth={rank === 1 ? '4px' : undefined}
                borderLeftColor={rank === 1 ? 'yellow.500' : undefined}
              >
                {medal ? <Text fontSize="md">{medal}</Text> : (
                  <Text fontSize="sm" color="fg.muted" fontWeight="medium">
                    {rank}
                  </Text>
                )}
              </Box>

              {/* Имя поэта */}
              <Box
                px={3}
                py={2.5}
                borderBottomWidth="1px"
                borderBottomColor="border.muted"
                fontWeight={isTop3 ? 'semibold' : 'normal'}
                bg={i % 2 === 1 ? 'bg.subtle' : undefined}
              >
                <Flex align="center" gap={1.5}>
                  <Link href={playerHref}>
                    <Text _hover={{ color: 'brand.solid' }} transition="color 0.15s">
                      {p.name}
                    </Text>
                  </Link>
                  <SocialLinks socialLinks={p.socialLinks as SocialLink[]} />
                </Flex>
              </Box>

              {/* Команда */}
              <Box
                px={3}
                py={2.5}
                borderBottomWidth="1px"
                borderBottomColor="border.muted"
                color="fg.muted"
                fontSize="sm"
                bg={i % 2 === 1 ? 'bg.subtle' : undefined}
              >
                {p.currentTeam ?? '—'}
              </Box>

              {/* Выступлений */}
              <Box
                px={3}
                py={2.5}
                borderBottomWidth="1px"
                borderBottomColor="border.muted"
                textAlign="center"
                bg={i % 2 === 1 ? 'bg.subtle' : undefined}
              >
                {p.matchesPlayed}
              </Box>

              {/* Всего (суммарный балл) — только при showDetailedStats */}
              {showDetailedStats && (
                <Box
                  px={3}
                  py={2.5}
                  borderBottomWidth="1px"
                  borderBottomColor="border.muted"
                  textAlign="center"
                  fontWeight="bold"
                  fontFamily="mono"
                  color={isTop3 ? 'brand.solid' : undefined}
                  bg={i % 2 === 1 ? 'bg.subtle' : undefined}
                >
                  {p.totalScore}
                </Box>
              )}

              {/* Средний балл */}
              <Box
                px={3}
                py={2.5}
                borderBottomWidth="1px"
                borderBottomColor="border.muted"
                textAlign="center"
                fontWeight={showDetailedStats ? undefined : 'bold'}
                fontFamily="mono"
                color={!showDetailedStats && isTop3 ? 'brand.solid' : undefined}
                bg={i % 2 === 1 ? 'bg.subtle' : undefined}
              >
                {p.avgScore}
              </Box>

              {/* Лучший — только при showDetailedStats */}
              {showDetailedStats && (
                <Box
                  px={3}
                  py={2.5}
                  borderBottomWidth="1px"
                  borderBottomColor="border.muted"
                  textAlign="center"
                  fontFamily="mono"
                  color={p.bestScore === 30 ? 'yellow.500' : undefined}
                  bg={i % 2 === 1 ? 'bg.subtle' : undefined}
                >
                  {p.bestScore}
                </Box>
              )}

              {/* Текст */}
              <Box
                px={3}
                py={2.5}
                borderBottomWidth="1px"
                borderBottomColor="border.muted"
                textAlign="center"
                fontSize="xs"
                color="fg.muted"
                bg={i % 2 === 1 ? 'bg.subtle' : undefined}
              >
                {p.avgText}
              </Box>

              {/* Подача */}
              <Box
                px={3}
                py={2.5}
                borderBottomWidth="1px"
                borderBottomColor="border.muted"
                textAlign="center"
                fontSize="xs"
                color="fg.muted"
                bg={i % 2 === 1 ? 'bg.subtle' : undefined}
              >
                {p.avgDelivery}
              </Box>
            </Box>
          )
        })}
      </Grid>
    </DataTableWrapper>
  )
}
