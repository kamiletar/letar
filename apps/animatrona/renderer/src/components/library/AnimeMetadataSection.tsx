'use client'

import {
  Badge,
  Box,
  Button,
  Card,
  Collapsible,
  Grid,
  Heading,
  HStack,
  Image,
  Skeleton,
  Text,
  VStack,
  Wrap,
} from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import {
  LuBuilding2,
  LuCaptions,
  LuCheck,
  LuChevronDown,
  LuChevronUp,
  LuDatabase,
  LuExternalLink,
  LuHardDrive,
  LuMic,
  LuRefreshCw,
  LuTv,
  LuUser,
  LuUsers,
} from 'react-icons/lu'

import { getLocalDubGroups } from '@/app/_actions/audio-track.action'
import { saveGenresAndThemes, type ShikimoriGenreInput } from '@/app/_actions/genre.action'
import type {
  ShikimoriAnimeExtended,
  ShikimoriCharacterRole,
  ShikimoriPersonRole,
  ShikimoriStudio,
} from '@/types/electron'

interface AnimeMetadataSectionProps {
  /** ID аниме в БД */
  animeId: string
  /** Shikimori ID аниме */
  shikimoriId: number | null
}

/** Локализация ролей персонала */
const roleTranslations: Record<string, string> = {
  Director: 'Режиссёр',
  Original_Creator: 'Автор оригинала',
  Character_Design: 'Дизайн персонажей',
  Music: 'Музыка',
  Series_Composition: 'Сценарий',
  Animation_Director: 'Директор анимации',
  Art_Director: 'Арт-директор',
  Sound_Director: 'Звукорежиссёр',
  Producer: 'Продюсер',
  Main: 'Главная роль',
  Supporting: 'Второстепенная роль',
}

/** Получить русское название роли */
function translateRole(role: string): string {
  return roleTranslations[role] || role.replaceAll('_', ' ')
}

/**
 * Нормализует название озвучки для сравнения
 * "SHIZA Project" → "shiza", "[SHIZA]" → "shiza"
 */
function normalizeDubName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[[\]()]/g, '') // Убрать скобки
    .replace(/\s+project$/i, '') // "SHIZA Project" → "SHIZA"
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Проверяет, есть ли совпадение между Shikimori fandubber и локальными dubGroups
 */
function matchFandubber(shikimoriName: string, localGroups: string[]): boolean {
  const normalizedShikimori = normalizeDubName(shikimoriName)

  return localGroups.some((local) => {
    const normalizedLocal = normalizeDubName(local)
    // Проверяем: содержит ли одна строка другую
    return normalizedShikimori.includes(normalizedLocal) || normalizedLocal.includes(normalizedShikimori)
  })
}

/** Карточка студии */
function StudioCard({ studio }: { studio: ShikimoriStudio }) {
  return (
    <Card.Root bg="bg.subtle" border="1px" borderColor="border.subtle" size="sm">
      <Card.Body>
        <HStack gap={3}>
          {studio.imageUrl
            ? (
              <Image
                src={studio.imageUrl}
                alt={studio.name}
                boxSize={8}
                borderRadius="md"
                objectFit="contain"
                loading="lazy"
                decoding="async"
              />
            )
            : <LuBuilding2 size={24} color="var(--chakra-colors-fg-muted)" />}
          <Text fontWeight="medium" fontSize="sm">
            {studio.name}
          </Text>
        </HStack>
      </Card.Body>
    </Card.Root>
  )
}

/** Карточка члена персонала */
function StaffCard({ person }: { person: ShikimoriPersonRole }) {
  const roleName = person.rolesRu?.[0] || person.rolesEn?.[0] || ''
  return (
    <Card.Root bg="bg.subtle" border="1px" borderColor="border.subtle" size="sm">
      <Card.Body>
        <HStack gap={3}>
          {person.person.poster?.mainUrl
            ? (
              <Image
                src={person.person.poster.mainUrl}
                alt={person.person.name}
                boxSize={10}
                borderRadius="md"
                objectFit="cover"
                loading="lazy"
                decoding="async"
              />
            )
            : (
              <Box
                boxSize={10}
                bg="bg.subtle"
                borderRadius="md"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <LuUser size={20} color="var(--chakra-colors-fg-subtle)" />
              </Box>
            )}
          <VStack align="start" gap={0}>
            <Text fontWeight="medium" fontSize="sm">
              {person.person.russian || person.person.name}
            </Text>
            <Text fontSize="xs" color="fg.muted">
              {translateRole(roleName)}
            </Text>
          </VStack>
        </HStack>
      </Card.Body>
    </Card.Root>
  )
}

/** Карточка персонажа */
function CharacterCard({ role }: { role: ShikimoriCharacterRole }) {
  const characterRole = role.rolesRu?.[0] || role.rolesEn?.[0] || ''
  return (
    <Card.Root bg="bg.subtle" border="1px" borderColor="border.subtle" size="sm">
      <Card.Body>
        <HStack gap={3}>
          {role.character.poster?.mainUrl
            ? (
              <Image
                src={role.character.poster.mainUrl}
                alt={role.character.name}
                boxSize={10}
                borderRadius="md"
                objectFit="cover"
                loading="lazy"
                decoding="async"
              />
            )
            : (
              <Box
                boxSize={10}
                bg="bg.subtle"
                borderRadius="md"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <LuUsers size={20} color="var(--chakra-colors-fg-subtle)" />
              </Box>
            )}
          <VStack align="start" gap={0}>
            <Text fontWeight="medium" fontSize="sm">
              {role.character.russian || role.character.name}
            </Text>
            <Badge colorPalette={characterRole === 'Main' ? 'purple' : 'gray'} size="sm">
              {translateRole(characterRole)}
            </Badge>
          </VStack>
        </HStack>
      </Card.Body>
    </Card.Root>
  )
}

/**
 * Секция расширенных метаданных аниме (студии, персонал, персонажи)
 * Загружает данные из Shikimori API и позволяет сохранить в БД
 */
export function AnimeMetadataSection({ animeId, shikimoriId }: AnimeMetadataSectionProps) {
  const [data, setData] = useState<ShikimoriAnimeExtended | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [isExpanded, setIsExpanded] = useState(false)
  const [localDubGroups, setLocalDubGroups] = useState<string[]>([])

  /** Загрузить расширенные метаданные */
  const fetchMetadata = useCallback(async () => {
    if (!shikimoriId || !window.electronAPI) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await window.electronAPI.shikimori.getExtended(shikimoriId)
      if (result.success && result.data) {
        setData(result.data)
      } else {
        setError(result.error || 'Не удалось загрузить метаданные')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setIsLoading(false)
    }
  }, [shikimoriId])

  /**
   * Сохранить жанры в БД и обновить AnimeManifest в IPFS
   * v0.28.0: Расширенные метаданные (studios, staff, characters и т.д.) теперь хранятся в AnimeManifest
   */
  const handleSaveToDb = useCallback(async () => {
    if (!data) {
      return
    }

    setIsSaving(true)
    setSaveStatus('idle')

    try {
      // 1. Сохраняем жанры/темы в БД (для фильтрации в списке библиотеки)
      if (data.genres?.length) {
        const genres: ShikimoriGenreInput[] = data.genres.map((g) => ({
          id: g.id,
          name: g.name,
          russian: g.russian,
          kind: g.kind ?? 'genre',
        }))
        const genreResult = await saveGenresAndThemes(animeId, genres)
        if (!genreResult.success) {
          console.warn('[AnimeMetadataSection] Failed to save genres:', genreResult.error)
        }
      }

      // 2. Обновляем AnimeManifest в IPFS (студии, персонал, персонажи и т.д.)
      if (window.electronAPI?.animeManifest) {
        await window.electronAPI.animeManifest.update(animeId)
      }

      setSaveStatus('saved')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }, [animeId, data])

  // Загрузить данные при первом рендере
  useEffect(() => {
    fetchMetadata()
  }, [fetchMetadata])

  // Загрузить локальные dubGroups для сопоставления с Shikimori
  useEffect(() => {
    if (!animeId) {
      return
    }

    getLocalDubGroups(animeId).then(setLocalDubGroups).catch(console.error)
  }, [animeId])

  // Не показывать секцию если нет shikimoriId
  if (!shikimoriId) {
    return null
  }

  // Скелетон при загрузке
  if (isLoading) {
    return (
      <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
        <Card.Body>
          <VStack gap={4} align="stretch">
            <Skeleton height="24px" width="200px" />
            <Grid templateColumns="repeat(3, 1fr)" gap={3}>
              <Skeleton height="60px" borderRadius="md" />
              <Skeleton height="60px" borderRadius="md" />
              <Skeleton height="60px" borderRadius="md" />
            </Grid>
          </VStack>
        </Card.Body>
      </Card.Root>
    )
  }

  // Показать ошибку
  if (error) {
    return (
      <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
        <Card.Body>
          <Text color="fg.subtle" fontSize="sm">
            {error}
          </Text>
        </Card.Body>
      </Card.Root>
    )
  }

  // Нет данных
  if (!data) {
    return null
  }

  // Фильтруем режиссёров и ключевой персонал
  const directors = data.personRoles.filter((p) => p.rolesEn.includes('Director') || p.rolesRu.includes('Режиссёр'))
  const keyStaff = data.personRoles
    .filter(
      (p) =>
        p.rolesEn.some((r) =>
          ['Original_Creator', 'Character_Design', 'Music', 'Series_Composition'].includes(r.replace(' ', '_'))
        ) || p.rolesRu.some((r) => ['Автор оригинала', 'Дизайн персонажей', 'Музыка', 'Сценарий'].includes(r)),
    )
    .slice(0, 8)

  // Главные персонажи
  const mainCharacters = data.characterRoles.filter((c) => c.rolesEn.includes('Main') || c.rolesRu.includes('Main'))
  const supportingCharacters = data.characterRoles
    .filter((c) => c.rolesEn.includes('Supporting') || c.rolesRu.includes('Supporting'))
    .slice(0, 8)

  const hasStudios = data.studios.length > 0
  const hasStaff = directors.length > 0 || keyStaff.length > 0
  const hasCharacters = mainCharacters.length > 0 || supportingCharacters.length > 0
  const hasFandubbers = data.fandubbers.length > 0 || localDubGroups.length > 0
  const hasFansubbers = data.fansubbers.length > 0
  const hasExternalLinks = data.externalLinks.length > 0

  // Локальные озвучки которых нет в Shikimori
  const unmatchedLocalGroups = localDubGroups.filter(
    (local) => !data.fandubbers.some((shikimori) => matchFandubber(shikimori, [local])),
  )

  // Нет данных для отображения
  if (!hasStudios && !hasStaff && !hasCharacters && !hasFandubbers && !hasFansubbers && !hasExternalLinks) {
    return null
  }

  const ExpandIcon = isExpanded ? LuChevronUp : LuChevronDown

  return (
    <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
      <Card.Body>
        <VStack gap={6} align="stretch">
          {/* Заголовок с кнопками */}
          <HStack justify="space-between">
            <HStack gap={3}>
              <Heading size="md">Метаданные Shikimori</Heading>
              <a href={`https://shikimori.one/animes/${shikimoriId}`} target="_blank" rel="noopener noreferrer">
                <Badge colorPalette="purple" variant="subtle" cursor="pointer" _hover={{ bg: 'purple.900' }}>
                  <LuExternalLink style={{ marginRight: '4px' }} />
                  Открыть на Shikimori
                </Badge>
              </a>
            </HStack>
            <HStack gap={2}>
              <Button size="xs" variant="ghost" onClick={fetchMetadata} disabled={isLoading}>
                <LuRefreshCw
                  style={{
                    marginRight: '4px',
                    animation: isLoading ? 'spin 1s linear infinite' : undefined,
                  }}
                />
                Обновить
              </Button>
              <Button
                size="xs"
                variant="solid"
                colorPalette={saveStatus === 'saved' ? 'green' : 'purple'}
                onClick={handleSaveToDb}
                disabled={isSaving || saveStatus === 'saved'}
              >
                <LuDatabase style={{ marginRight: '4px' }} />
                {saveStatus === 'saved' ? 'Сохранено' : isSaving ? 'Сохранение...' : 'Обновить манифест'}
              </Button>
            </HStack>
          </HStack>

          {/* Студии + Режиссёры (на одной строке если помещаются) */}
          {(hasStudios || directors.length > 0) && (
            <Wrap gap={6} align="flex-start">
              {/* Студии */}
              {hasStudios && (
                <Box>
                  <HStack mb={2}>
                    <LuBuilding2 color="var(--chakra-colors-fg-muted)" size={16} />
                    <Heading size="sm">Студия</Heading>
                  </HStack>
                  <Wrap gap={2}>
                    {data.studios.map((studio) => <StudioCard key={studio.id} studio={studio} />)}
                  </Wrap>
                </Box>
              )}

              {/* Режиссёры */}
              {directors.length > 0 && (
                <Box>
                  <HStack mb={2}>
                    <LuTv color="var(--chakra-colors-fg-muted)" size={16} />
                    <Heading size="sm">Режиссёр</Heading>
                  </HStack>
                  <Wrap gap={2}>
                    {directors.map((person) => <StaffCard key={person.id} person={person} />)}
                  </Wrap>
                </Box>
              )}
            </Wrap>
          )}

          {/* Персонажи (сворачиваемая секция) */}
          {hasCharacters && (
            <Collapsible.Root open={isExpanded} onOpenChange={(e) => setIsExpanded(e.open)}>
              <Collapsible.Trigger asChild>
                <Box
                  as="button"
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  w="full"
                  py={2}
                  cursor="pointer"
                  _hover={{ color: 'fg.muted' }}
                >
                  <HStack>
                    <LuUsers color="var(--chakra-colors-fg-muted)" />
                    <Heading size="sm">Персонажи ({mainCharacters.length + supportingCharacters.length})</Heading>
                  </HStack>
                  <ExpandIcon />
                </Box>
              </Collapsible.Trigger>
              <Collapsible.Content>
                <VStack gap={4} align="stretch" pt={3}>
                  {/* Главные персонажи */}
                  {mainCharacters.length > 0 && (
                    <Box>
                      <Text fontSize="xs" color="fg.subtle" mb={2}>
                        Главные
                      </Text>
                      <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={2}>
                        {mainCharacters.map((role) => <CharacterCard key={role.id} role={role} />)}
                      </Grid>
                    </Box>
                  )}

                  {/* Второстепенные персонажи */}
                  {supportingCharacters.length > 0 && (
                    <Box>
                      <Text fontSize="xs" color="fg.subtle" mb={2}>
                        Второстепенные
                      </Text>
                      <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={2}>
                        {supportingCharacters.map((role) => <CharacterCard key={role.id} role={role} />)}
                      </Grid>
                    </Box>
                  )}
                </VStack>
              </Collapsible.Content>
            </Collapsible.Root>
          )}

          {/* Озвучка и субтитры */}
          {(hasFandubbers || hasFansubbers) && (
            <Wrap gap={6} align="flex-start">
              {/* Фандабберы */}
              {hasFandubbers && (
                <Box>
                  <HStack mb={3}>
                    <LuMic color="var(--chakra-colors-fg-muted)" />
                    <Heading size="sm">Озвучка</Heading>
                  </HStack>
                  <Wrap gap={2}>
                    {/* Shikimori fandubbers с подсветкой локальных */}
                    {data.fandubbers.map((fandubber) => {
                      const hasLocal = matchFandubber(fandubber, localDubGroups)
                      return (
                        <Badge
                          key={fandubber}
                          colorPalette={hasLocal ? 'green' : 'gray'}
                          variant={hasLocal ? 'solid' : 'outline'}
                        >
                          {hasLocal && <LuCheck style={{ marginRight: '4px' }} />}
                          {fandubber}
                        </Badge>
                      )
                    })}
                    {/* Локальные озвучки без совпадений в Shikimori */}
                    {unmatchedLocalGroups.map((group) => (
                      <Badge key={group} colorPalette="purple" variant="subtle">
                        <LuHardDrive style={{ marginRight: '4px' }} />
                        {group}
                      </Badge>
                    ))}
                  </Wrap>
                </Box>
              )}

              {/* Фансабберы (субтитры) */}
              {hasFansubbers && (
                <Box>
                  <HStack mb={3}>
                    <LuCaptions color="var(--chakra-colors-fg-muted)" />
                    <Heading size="sm">Субтитры</Heading>
                  </HStack>
                  <Wrap gap={2}>
                    {data.fansubbers.map((fansubber) => (
                      <Badge key={fansubber} colorPalette="blue" variant="outline">
                        {fansubber}
                      </Badge>
                    ))}
                  </Wrap>
                </Box>
              )}
            </Wrap>
          )}

          {/* Внешние ссылки */}
          {hasExternalLinks && (
            <Box>
              <HStack mb={3}>
                <LuExternalLink color="var(--chakra-colors-fg-muted)" />
                <Heading size="sm">Ссылки</Heading>
              </HStack>
              <Wrap gap={2}>
                {data.externalLinks.map((link) => (
                  <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer">
                    <Badge colorPalette="gray" variant="outline" cursor="pointer" _hover={{ bg: 'bg.subtle' }}>
                      {link.kind.replace(/_/g, ' ')}
                    </Badge>
                  </a>
                ))}
              </Wrap>
            </Box>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
