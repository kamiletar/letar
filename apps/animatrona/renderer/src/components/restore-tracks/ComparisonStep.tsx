'use client'

/**
 * ComparisonStep — подробное сравнение донор vs библиотека
 *
 * Сводная таблица (StatRow) + Accordion по эпизодам с детализацией каждой дорожки.
 * Каждая дорожка показывает статус: ✅ уже есть / ⚠️ будет восстановлена.
 */

import { Accordion, Badge, Box, HStack, Separator, Text, VStack } from '@chakra-ui/react'
import { useMemo } from 'react'
import { LuBookOpen, LuCaptions, LuCheck, LuFileAudio, LuMusic, LuTriangleAlert, LuType } from 'react-icons/lu'

import type { TrackInfo } from '@/lib/add-tracks'
import type { ComparisonSummary, EpisodeComparison } from '@/lib/restore-tracks/use-restore-tracks-flow'
import { DonorTrackCard } from './ComparisonTrackCard'

interface ComparisonStepProps {
  comparison: ComparisonSummary
}

// === Вспомогательные компоненты ===

/** Строка статистики в сводной таблице */
function StatRow({
  icon,
  label,
  donorCount,
  libraryCount,
  missingCount,
}: {
  icon: React.ElementType
  label: string
  donorCount: number
  libraryCount: number
  missingCount: number
}) {
  const isOk = missingCount === 0
  const IconComponent = icon

  return (
    <HStack gap={3} py={1.5}>
      <IconComponent
        color={isOk ? 'var(--chakra-colors-green-500)' : 'var(--chakra-colors-orange-500)'}
        size={20}
        style={{ flexShrink: 0 }}
      />
      <Text fontSize="sm" flex={1}>
        {label}
      </Text>
      <HStack gap={2} flexShrink={0}>
        <Badge variant="subtle" colorPalette="purple" size="sm">
          Донор: {donorCount}
        </Badge>
        <Badge variant="subtle" colorPalette="blue" size="sm">
          Библ: {libraryCount}
        </Badge>
        {isOk
          ? (
            <Badge colorPalette="green" size="sm" gap={0.5}>
              <LuCheck size={12} />
              OK
            </Badge>
          )
          : (
            <Badge colorPalette="red" size="sm">
              +{missingCount}
            </Badge>
          )}
      </HStack>
    </HStack>
  )
}

/** Секция дорожек внутри аккордеона (заголовок + контент) */
function TrackSection({
  label,
  icon,
  children,
}: {
  label: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  const IconComponent = icon

  return (
    <VStack align="stretch" gap={1.5}>
      <HStack gap={1.5}>
        <IconComponent size={16} color="var(--chakra-colors-fg-subtle)" />
        <Text fontSize="xs" fontWeight="semibold" color="fg.subtle">
          {label}
        </Text>
      </HStack>
      {children}
    </VStack>
  )
}

/** Есть ли пропущенные дорожки в эпизоде */
function hasMissing(ep: EpisodeComparison): boolean {
  return (
    ep.missing.audio.length > 0
    || ep.missing.subtitles.length > 0
    || ep.missing.externalAudio.length > 0
    || ep.missing.externalSubtitles.length > 0
    || ep.missing.fonts.length > 0
  )
}

// === Аккордеон-элемент эпизода ===

function EpisodeAccordionItem({ episode }: { episode: EpisodeComparison }) {
  // Set missing track IDs для O(1) lookup
  const missingIds = useMemo(() => {
    const set = new Set<string>()
    for (const t of episode.missing.audio) {
      set.add(t.id)
    }
    for (const t of episode.missing.subtitles) {
      set.add(t.id)
    }
    for (const t of episode.missing.externalAudio) {
      set.add(t.id)
    }
    for (const t of episode.missing.externalSubtitles) {
      set.add(t.id)
    }
    return set
  }, [episode.missing])

  // Группировка внешних аудио по dubGroup
  const extAudioGroups = useMemo(() => {
    const groups = new Map<string, TrackInfo[]>()
    for (const t of episode.donor.externalAudio) {
      const key = t.dubGroup || 'Без группы'
      const arr = groups.get(key) || []
      arr.push(t)
      groups.set(key, arr)
    }
    return groups
  }, [episode.donor.externalAudio])

  const totalDonor = episode.donor.audio.length
    + episode.donor.subtitles.length
    + episode.donor.externalAudio.length
    + episode.donor.externalSubtitles.length
  const totalMissing = missingIds.size + episode.missing.fonts.length
  const isOk = totalMissing === 0

  // Пропускаем пустые эпизоды (нет дорожек в доноре и нет fonts)
  const hasContent = totalDonor > 0 || episode.donor.fonts.length > 0

  return (
    <Accordion.Item value={episode.episodeId}>
      <Accordion.ItemTrigger cursor="pointer">
        <HStack flex={1} justify="space-between" pr={2}>
          <Badge variant="subtle" colorPalette="purple" size="sm" minW="50px" justifyContent="center">
            EP {episode.episodeNumber}
          </Badge>
          {isOk
            ? (
              <Badge colorPalette="green" size="sm" gap={0.5}>
                <LuCheck size={12} />
                OK
              </Badge>
            )
            : (
              <Text fontSize="xs" color="orange.fg">
                {totalMissing} отсут. / {totalDonor} всего
              </Text>
            )}
        </HStack>
        <Accordion.ItemIndicator />
      </Accordion.ItemTrigger>

      <Accordion.ItemContent>
        <Accordion.ItemBody>
          {!hasContent
            ? (
              <Text fontSize="xs" color="fg.muted">
                Нет дорожек в доноре
              </Text>
            )
            : (
              <VStack gap={3} align="stretch">
                {/* Аудио из MKV */}
                {episode.donor.audio.length > 0 && (
                  <TrackSection label="Аудио из MKV" icon={LuMusic}>
                    <VStack gap={1} align="stretch">
                      {episode.donor.audio.map((t) => (
                        <DonorTrackCard key={t.id} track={t} type="audio" isMissing={missingIds.has(t.id)} />
                      ))}
                    </VStack>
                  </TrackSection>
                )}

                {/* Внешние озвучки по dubGroup */}
                {extAudioGroups.size > 0 && (
                  <TrackSection label="Внешние озвучки" icon={LuFileAudio}>
                    <VStack gap={2} align="stretch">
                      {Array.from(extAudioGroups.entries()).map(([group, tracks]) => {
                        const groupMissing = tracks.filter((t) => missingIds.has(t.id)).length
                        return (
                          <Box key={group} borderWidth="1px" borderColor="border" borderRadius="md" p={2}>
                            <HStack mb={1.5} gap={2}>
                              <Text fontSize="xs" fontWeight="medium">
                                {group}
                              </Text>
                              <Badge size="sm" variant="subtle" colorPalette="purple">
                                {tracks.length}
                              </Badge>
                              {groupMissing > 0 && (
                                <Badge size="sm" colorPalette="orange">
                                  +{groupMissing}
                                </Badge>
                              )}
                            </HStack>
                            <VStack gap={1} align="stretch">
                              {tracks.map((t) => (
                                <DonorTrackCard key={t.id} track={t} type="audio" isMissing={missingIds.has(t.id)} />
                              ))}
                            </VStack>
                          </Box>
                        )
                      })}
                    </VStack>
                  </TrackSection>
                )}

                {/* Субтитры из MKV */}
                {episode.donor.subtitles.length > 0 && (
                  <TrackSection label="Субтитры" icon={LuCaptions}>
                    <VStack gap={1} align="stretch">
                      {episode.donor.subtitles.map((t) => (
                        <DonorTrackCard key={t.id} track={t} type="subtitle" isMissing={missingIds.has(t.id)} />
                      ))}
                    </VStack>
                  </TrackSection>
                )}

                {/* Внешние субтитры */}
                {episode.donor.externalSubtitles.length > 0 && (
                  <TrackSection label="Внешние субтитры" icon={LuCaptions}>
                    <VStack gap={1} align="stretch">
                      {episode.donor.externalSubtitles.map((t) => (
                        <DonorTrackCard key={t.id} track={t} type="subtitle" isMissing={missingIds.has(t.id)} />
                      ))}
                    </VStack>
                  </TrackSection>
                )}

                {/* Шрифты */}
                {episode.donor.fonts.length > 0 && (
                  <TrackSection
                    label={`Шрифты (${
                      episode.missing.fonts.length > 0 ? `${episode.missing.fonts.length} отсутствует` : 'все на месте'
                    })`}
                    icon={LuType}
                  >
                    {episode.missing.fonts.length === 0
                      ? (
                        <Text fontSize="xs" color="green.fg">
                          Все {episode.donor.fonts.length} шрифтов на месте
                        </Text>
                      )
                      : (
                        <VStack gap={0.5} align="stretch">
                          {episode.donor.fonts.map((fontName) => {
                            const isMissing = episode.missing.fonts.includes(fontName)
                            return (
                              <HStack key={fontName} gap={2}>
                                {isMissing
                                  ? (
                                    <LuTriangleAlert
                                      color="var(--chakra-colors-orange-500)"
                                      size={12}
                                      style={{ flexShrink: 0 }}
                                    />
                                  )
                                  : (
                                    <LuCheck
                                      color="var(--chakra-colors-green-500)"
                                      size={12}
                                      style={{ flexShrink: 0 }}
                                    />
                                  )}
                                <Text fontSize="xs" color={isMissing ? 'fg' : 'fg.muted'}>
                                  {fontName}
                                </Text>
                              </HStack>
                            )
                          })}
                        </VStack>
                      )}
                  </TrackSection>
                )}
              </VStack>
            )}
        </Accordion.ItemBody>
      </Accordion.ItemContent>
    </Accordion.Item>
  )
}

// === Главный компонент ===

export function ComparisonStep({ comparison }: ComparisonStepProps) {
  const { totalMissing, totalTracksToRestore, episodes } = comparison

  // Суммы из доноров
  const totalDonorAudio = episodes.reduce((s, e) => s + e.donor.audio.length, 0)
  const totalDonorSubs = episodes.reduce((s, e) => s + e.donor.subtitles.length, 0)
  const totalDonorFonts = episodes.reduce((s, e) => s + e.donor.fonts.length, 0)
  const totalDonorChapters = episodes.filter((e) => e.donor.chapters.length > 0).length
  const totalDonorExtAudio = episodes.reduce((s, e) => s + e.donor.externalAudio.length, 0)
  const totalDonorExtSubs = episodes.reduce((s, e) => s + e.donor.externalSubtitles.length, 0)

  const totalLibAudio = episodes.reduce((s, e) => s + e.library.audioCount, 0)
  const totalLibSubs = episodes.reduce((s, e) => s + e.library.subtitleCount, 0)
  const totalLibFonts = episodes.reduce((s, e) => s + e.library.fontCount, 0)
  const totalLibChapters = episodes.filter((e) => e.library.hasChapters).length

  const allOk = totalTracksToRestore === 0 && totalMissing.fonts === 0 && totalMissing.chapters === 0

  // Авто-раскрыть эпизоды с пропусками
  const expandedEpisodes = useMemo(() => episodes.filter((e) => hasMissing(e)).map((e) => e.episodeId), [episodes])

  return (
    <VStack gap={5} align="stretch" py={4}>
      {/* Заголовок */}
      <Box textAlign="center">
        <VStack gap={2}>
          {allOk
            ? (
              <>
                <LuCheck size={48} color="var(--chakra-colors-green-500)" />
                <Text fontSize="lg" fontWeight="medium" color="green.500">
                  Все дорожки на месте
                </Text>
                <Text fontSize="sm" color="fg.muted">
                  Библиотека содержит все дорожки из донора
                </Text>
              </>
            )
            : (
              <>
                <Text fontSize="lg" fontWeight="medium">
                  Сравнение: донор vs библиотека
                </Text>
                <Text fontSize="sm" color="fg.muted">
                  Проанализировано {episodes.length} эпизодов
                </Text>
              </>
            )}
        </VStack>
      </Box>

      {/* Сводная статистика */}
      <Box p={4} bg="bg.muted" borderRadius="lg" borderWidth="1px" borderColor="border">
        <VStack gap={1} align="stretch">
          <StatRow
            icon={LuMusic}
            label="Аудиодорожки"
            donorCount={totalDonorAudio}
            libraryCount={totalLibAudio}
            missingCount={totalMissing.audio}
          />
          <StatRow
            icon={LuCaptions}
            label="Субтитры"
            donorCount={totalDonorSubs}
            libraryCount={totalLibSubs}
            missingCount={totalMissing.subtitles}
          />
          <StatRow
            icon={LuType}
            label="Шрифты"
            donorCount={totalDonorFonts}
            libraryCount={totalLibFonts}
            missingCount={totalMissing.fonts}
          />
          <StatRow
            icon={LuBookOpen}
            label="Главы (эпизоды)"
            donorCount={totalDonorChapters}
            libraryCount={totalLibChapters}
            missingCount={totalMissing.chapters}
          />

          {/* Внешние файлы */}
          {(totalDonorExtAudio > 0 || totalDonorExtSubs > 0) && (
            <>
              <Separator my={1} />
              <Text fontSize="xs" fontWeight="semibold" color="fg.subtle" mt={1}>
                Внешние файлы
              </Text>
              {totalDonorExtAudio > 0 && (
                <StatRow
                  icon={LuFileAudio}
                  label="Внешние аудио (озвучки)"
                  donorCount={totalDonorExtAudio}
                  libraryCount={totalDonorExtAudio - totalMissing.externalAudio}
                  missingCount={totalMissing.externalAudio}
                />
              )}
              {totalDonorExtSubs > 0 && (
                <StatRow
                  icon={LuCaptions}
                  label="Внешние субтитры"
                  donorCount={totalDonorExtSubs}
                  libraryCount={totalDonorExtSubs - totalMissing.externalSubtitles}
                  missingCount={totalMissing.externalSubtitles}
                />
              )}
            </>
          )}
        </VStack>
      </Box>

      {/* Подробности по эпизодам */}
      {!allOk && (
        <VStack gap={2} align="stretch">
          <Text fontSize="xs" color="fg.subtle" fontWeight="medium" px={1}>
            Подробности по эпизодам:
          </Text>
          <Box maxH="400px" overflowY="auto" borderRadius="md">
            <Accordion.Root multiple defaultValue={expandedEpisodes} size="sm" variant="enclosed">
              {episodes.map((ep) => <EpisodeAccordionItem key={ep.episodeId} episode={ep} />)}
            </Accordion.Root>
          </Box>
        </VStack>
      )}

      {/* Итого */}
      {!allOk && (
        <Text textAlign="center" fontSize="sm" color="fg.subtle">
          Будет восстановлено: {totalTracksToRestore} дорожек
          {totalMissing.fonts > 0 && ` + ${totalMissing.fonts} шрифтов`}
          {totalMissing.chapters > 0 && ` + главы для ${totalMissing.chapters} эп.`}
        </Text>
      )}
    </VStack>
  )
}
