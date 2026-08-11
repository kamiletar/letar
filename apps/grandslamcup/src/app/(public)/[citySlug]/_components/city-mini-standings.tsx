/**
 * Мини-таблица турнирного положения для главной страницы города.
 * Серверный компонент — показывает топ-5 команд текущего сезона.
 */

import { SectionHeading } from '@/app/_components/section-heading'
import { Box, Button, Flex, Grid, Text } from '@chakra-ui/react'
import Link from 'next/link'
import { LuArrowRight } from 'react-icons/lu'

/** Медали для позиций 1-3 */
const MEDALS = ['\u{1F947}', '\u{1F948}', '\u{1F949}']

/** Строка таблицы */
export interface StandingsRow {
  teamName: string
  teamSlug: string
  played: number
  won: number
  drawn: number
  lost: number
  points: number
}

interface CityMiniStandingsProps {
  standings: StandingsRow[]
  seasonName: string
  citySlug: string
}

/** Компактная таблица лиги — топ-5 */
export function CityMiniStandings({ standings, seasonName, citySlug }: CityMiniStandingsProps) {
  if (standings.length === 0) { return null }

  const cityPrefix = `/${citySlug}`

  return (
    <Box className="fade-in-up stagger-3">
      <SectionHeading mb={4}>Таблица — {seasonName}</SectionHeading>
      <Box borderWidth="1px" borderColor="border" borderRadius="xl" overflow="hidden">
        <Grid templateColumns="44px 1fr repeat(5, 50px)" gap={0} fontSize="sm">
          {/* Заголовки колонок */}
          {['#', 'Команда', 'И', 'В', 'Н', 'П', 'О'].map((h) => (
            <Box
              key={h}
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
              textAlign={h === '#' || h === 'Команда' ? 'left' : 'center'}
            >
              {h}
            </Box>
          ))}
          {/* Строки команд */}
          {standings.map((row, i) => {
            const isTop3 = i < 3
            const medal = MEDALS[i]
            return (
              <Box
                key={row.teamSlug}
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
                  fontWeight="bold"
                  bg={i % 2 === 1 ? 'bg.subtle' : undefined}
                  borderLeftWidth={i === 0 ? '4px' : undefined}
                  borderLeftColor={i === 0 ? 'green.500' : undefined}
                >
                  {medal ?? i + 1}
                </Box>
                {/* Название команды */}
                <Box
                  px={3}
                  py={2.5}
                  borderBottomWidth="1px"
                  borderBottomColor="border.muted"
                  bg={i % 2 === 1 ? 'bg.subtle' : undefined}
                >
                  <Link href={`${cityPrefix}/teams/${row.teamSlug}`}>
                    <Text
                      fontWeight={isTop3 ? 'semibold' : 'normal'}
                      _hover={{ color: 'brand.solid' }}
                      transition="color 0.15s"
                    >
                      {row.teamName}
                    </Text>
                  </Link>
                </Box>
                {/* Статистика: И, В, Н, П, О */}
                {[row.played, row.won, row.drawn, row.lost, row.points].map((val, j) => {
                  const isPoints = j === 4
                  return (
                    <Box
                      key={j}
                      px={3}
                      py={2.5}
                      borderBottomWidth="1px"
                      borderBottomColor="border.muted"
                      textAlign="center"
                      fontWeight={isPoints ? 'bold' : 'normal'}
                      color={isPoints ? 'brand.solid' : undefined}
                      fontFamily={isPoints ? 'mono' : undefined}
                      bg={i % 2 === 1 ? 'bg.subtle' : undefined}
                    >
                      {val}
                    </Box>
                  )
                })}
              </Box>
            )
          })}
        </Grid>
      </Box>
      <Flex justify="flex-end" mt={3}>
        <Link href={`${cityPrefix}/standings`}>
          <Button variant="ghost" size="sm" colorPalette="brand">
            Полная таблица
            <LuArrowRight size={14} />
          </Button>
        </Link>
      </Flex>
    </Box>
  )
}
