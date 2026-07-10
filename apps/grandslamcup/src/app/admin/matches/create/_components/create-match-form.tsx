'use client'

/**
 * Форма создания матча.
 * Первый шаг — выбор города (автопредвыбор для организатора одного города).
 * Затем: тип, тур/сезон, команды, площадка, дата.
 */

import { toaster } from '@/app/_components/ui/toaster'
import { createMatchAction } from '@/app/admin/matches/_actions/match-admin.action'
import { Box, Button, Field, Flex, Heading, Input, NativeSelect, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'

interface City {
  id: string
  name: string
  useHomeAway: boolean
}

interface Season {
  id: string
  name: string
  cityId: string
}

interface TeamSeasonItem {
  id: string
  teamName: string
  seasonId: string
  seasonName: string
  cityId: string
  leagueId: string
  leagueName: string
}

interface Venue {
  id: string
  name: string
  cityId: string
}

interface TourItem {
  id: string
  number: number
  roundNumber: number
  roundName: string
  roundStartDate: string | null
  seasonId: string
  seasonName: string
  seasonStatus: string
  cityId: string
  matchCount: number
  /** stageId — если тур в плей-офф раунде, иначе null */
  stageId: string | null
}

interface BracketSlotItem {
  stageId: string
  teamSeasonId: string
}

interface CreateMatchFormProps {
  cities: City[]
  seasons: Season[]
  teamSeasons: TeamSeasonItem[]
  venues: Venue[]
  tours: TourItem[]
  /** Слоты плей-офф сетки с уже определёнными командами */
  bracketSlots: BracketSlotItem[]
  /** W-L записи по teamSeason ID для Swiss-матчей активных сезонов */
  swissTeamRecords: Record<string, { total: number; wins: number; losses: number }>
  /** null = полный админ (все города), массив = только эти города */
  organizerCityIds: string[] | null
}

export function CreateMatchForm({
  cities,
  seasons,
  teamSeasons,
  venues,
  tours,
  bracketSlots,
  swissTeamRecords,
  organizerCityIds,
}: CreateMatchFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Доступные города (все для админа, только свои для организатора)
  const availableCities = useMemo(() => {
    if (organizerCityIds === null) return cities
    return cities.filter((c) => organizerCityIds.includes(c.id))
  }, [cities, organizerCityIds])

  const [cityId, setCityId] = useState('')
  const [matchType, setMatchType] = useState<'REGULAR' | 'FRIENDLY'>('REGULAR')
  const [seasonId, setSeasonId] = useState('')
  const [tourId, setTourId] = useState('')
  const [homeTeamId, setHomeTeamId] = useState('')
  const [awayTeamId, setAwayTeamId] = useState('')
  const [venueId, setVenueId] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')

  // Автопредвыбор города если организатор только одного
  useEffect(() => {
    if (availableCities.length === 1 && !cityId) {
      setCityId(availableCities[0].id)
    }
  }, [availableCities, cityId])

  // Фильтрация по городу
  const filteredSeasons = useMemo(
    () => (cityId ? seasons.filter((s) => s.cityId === cityId) : seasons),
    [seasons, cityId]
  )

  const filteredTours = useMemo(() => (cityId ? tours.filter((t) => t.cityId === cityId) : tours), [tours, cityId])
  const activeTours = useMemo(() => filteredTours.filter((t) => t.seasonStatus === 'ACTIVE'), [filteredTours])

  // Ожидаемое кол-во матчей в туре (команд / 2)
  const getExpected = useMemo(() => {
    return (seasonId: string) => {
      const count = teamSeasons.filter((ts) => ts.seasonId === seasonId && ts.cityId === cityId).length
      return Math.floor(count / 2)
    }
  }, [teamSeasons, cityId])

  // Туры с незаполненными слотами (показываем только их в dropdown)
  const toursWithSlots = useMemo(
    () =>
      activeTours.filter((t) => {
        if (t.stageId) return true // плей-офф туры не ограничиваем
        const expected = getExpected(t.seasonId)
        return expected === 0 || t.matchCount < expected
      }),
    [activeTours, getExpected]
  )

  // Автопредвыбор актуального тура при смене города (REGULAR)
  useEffect(() => {
    if (!cityId || matchType !== 'REGULAR' || tourId) return
    if (toursWithSlots.length === 0) return
    const sorted = [...toursWithSlots].sort((a, b) =>
      a.roundNumber !== b.roundNumber ? a.roundNumber - b.roundNumber : a.number - b.number
    )
    setTourId(sorted[0].id)
  }, [cityId, matchType, toursWithSlots, tourId])

  const filteredVenues = useMemo(() => (cityId ? venues.filter((v) => v.cityId === cityId) : venues), [venues, cityId])

  // Если у города useHomeAway=false — убираем терминологию «домашняя/гостевая»
  const selectedCity = cities.find((c) => c.id === cityId)
  const useHomeAway = selectedCity?.useHomeAway ?? false
  const team1Label = useHomeAway ? 'Домашняя команда' : 'Команда 1'
  const team2Label = useHomeAway ? 'Гостевая команда' : 'Команда 2'

  // seasonId из тура (REGULAR) или из dropdown (FRIENDLY)
  const selectedTour = tours.find((t) => t.id === tourId)
  const effectiveSeasonId = matchType === 'REGULAR' ? (selectedTour?.seasonId ?? '') : seasonId

  // stageId выбранного тура (плей-офф тур)
  const selectedTourStageId = selectedTour?.stageId ?? null

  // Команды по сезону, с учётом bracket-фильтрации для плей-офф туров
  const filteredTeams = useMemo(() => {
    let base = teamSeasons
    if (effectiveSeasonId) {
      base = base.filter((ts) => ts.seasonId === effectiveSeasonId)
    } else if (cityId) {
      base = base.filter((ts) => ts.cityId === cityId)
    }

    // Плей-офф тур — только команды в сетке
    if (matchType === 'REGULAR' && selectedTourStageId) {
      const inBracket = new Set(
        bracketSlots.filter((s) => s.stageId === selectedTourStageId).map((s) => s.teamSeasonId)
      )
      if (inBracket.size > 0) {
        base = base.filter((ts) => inBracket.has(ts.id))
      }
    }

    // Swiss тур (без stageId) — фильтруем по W-L записям
    // Для Тура N: total = N-1 (команда сыграла N-1 матчей) + wins < 3 + losses < 3
    if (matchType === 'REGULAR' && !selectedTourStageId && selectedTour) {
      const tourN = selectedTour.number
      base = base.filter((ts) => {
        const rec = swissTeamRecords[ts.id]
        const total = rec?.total ?? 0
        const wins = rec?.wins ?? 0
        const losses = rec?.losses ?? 0
        return total === tourN - 1 && wins < 3 && losses < 3
      })
    }

    return base
  }, [
    teamSeasons,
    effectiveSeasonId,
    cityId,
    matchType,
    selectedTourStageId,
    bracketSlots,
    swissTeamRecords,
    selectedTour,
  ])

  const selectedHomeTeam = teamSeasons.find((ts) => ts.id === homeTeamId)
  const effectiveLeagueId = selectedHomeTeam?.leagueId ?? ''

  /** Сброс зависимых полей при смене города */
  function handleCityChange(newCityId: string) {
    setCityId(newCityId)
    setSeasonId('')
    setTourId('')
    setHomeTeamId('')
    setAwayTeamId('')
    setVenueId('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    startTransition(async () => {
      const result = await createMatchAction({
        matchType,
        seasonId: matchType === 'FRIENDLY' ? seasonId : undefined,
        tourId: matchType === 'REGULAR' ? tourId : undefined,
        leagueId: matchType === 'REGULAR' ? effectiveLeagueId : undefined,
        homeTeamId,
        awayTeamId,
        venueId: venueId || undefined,
        scheduledAt: scheduledAt || undefined,
      })

      if (!result.success) {
        toaster.error({ title: result.error })
        return
      }

      toaster.success({ title: 'Матч создан' })
      router.push('/admin/matches')
    })
  }

  return (
    <VStack gap={6} align="stretch">
      <Flex justify="space-between" align="center">
        <Heading size="lg">Создать матч</Heading>
      </Flex>

      <Box bg="bg.panel" p={6} borderRadius="xl" borderWidth="1px" borderColor="border.muted">
        <form onSubmit={handleSubmit}>
          <VStack gap={4} align="stretch">
            {/* Город — первый шаг */}
            <Field.Root required>
              <Field.Label>Город</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field value={cityId} onChange={(e) => handleCityChange(e.target.value)}>
                  <option value="">Выберите город...</option>
                  {availableCities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>

            {/* Тип матча */}
            {cityId && (
              <Field.Root>
                <Field.Label>Тип матча</Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field
                    value={matchType}
                    onChange={(e) => {
                      setMatchType(e.target.value as 'REGULAR' | 'FRIENDLY')
                      setTourId('')
                      setSeasonId('')
                      setHomeTeamId('')
                      setAwayTeamId('')
                    }}
                  >
                    <option value="REGULAR">Регулярный</option>
                    <option value="FRIENDLY">Товарищеский</option>
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>
            )}

            {/* Тур (REGULAR) */}
            {cityId && matchType === 'REGULAR' && (
              <Field.Root required>
                <Field.Label>Тур</Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field
                    value={tourId}
                    onChange={(e) => {
                      setTourId(e.target.value)
                      setHomeTeamId('')
                      setAwayTeamId('')
                    }}
                  >
                    <option value="">Выберите тур...</option>
                    {activeTours.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.seasonName} — {t.roundName}, тур {t.number}
                      </option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>
            )}

            {/* Сезон (FRIENDLY) */}
            {cityId && matchType === 'FRIENDLY' && (
              <Field.Root required>
                <Field.Label>Сезон</Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field
                    value={seasonId}
                    onChange={(e) => {
                      setSeasonId(e.target.value)
                      setHomeTeamId('')
                      setAwayTeamId('')
                    }}
                  >
                    <option value="">Выберите сезон...</option>
                    {filteredSeasons.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>
            )}

            {/* Команда 1 / Домашняя */}
            {cityId && (
              <Field.Root required disabled={matchType === 'REGULAR' && !tourId}>
                <Field.Label>{team1Label}</Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field value={homeTeamId} onChange={(e) => setHomeTeamId(e.target.value)}>
                    <option value="">Выберите команду...</option>
                    {filteredTeams.map((ts) => (
                      <option key={ts.id} value={ts.id}>
                        {ts.teamName} ({ts.leagueName})
                      </option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>
            )}

            {/* Команда 2 / Гостевая */}
            {cityId && (
              <Field.Root required disabled={matchType === 'REGULAR' && !tourId}>
                <Field.Label>{team2Label}</Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field value={awayTeamId} onChange={(e) => setAwayTeamId(e.target.value)}>
                    <option value="">Выберите команду...</option>
                    {filteredTeams
                      .filter((ts) => ts.id !== homeTeamId)
                      .map((ts) => (
                        <option key={ts.id} value={ts.id}>
                          {ts.teamName} ({ts.leagueName})
                        </option>
                      ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>
            )}

            {/* Площадка */}
            {cityId && (
              <Field.Root>
                <Field.Label>Площадка</Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field value={venueId} onChange={(e) => setVenueId(e.target.value)}>
                    <option value="">Не указана</option>
                    {filteredVenues.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>
            )}

            {/* Дата и время */}
            {cityId && (
              <Field.Root>
                <Field.Label>Дата и время</Field.Label>
                <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
              </Field.Root>
            )}

            {/* Кнопка отправки */}
            <Flex gap={3} pt={2}>
              <Button
                type="submit"
                colorPalette="blue"
                loading={isPending}
                disabled={
                  isPending ||
                  !cityId ||
                  !homeTeamId ||
                  !awayTeamId ||
                  (matchType === 'REGULAR' && !tourId) ||
                  (matchType === 'FRIENDLY' && !seasonId)
                }
              >
                Создать матч
              </Button>
              <Button variant="outline" onClick={() => router.push('/admin/matches')} disabled={isPending}>
                Отмена
              </Button>
            </Flex>
          </VStack>
        </form>
      </Box>
    </VStack>
  )
}
