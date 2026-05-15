'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { formatFileSize, resolveImageUrl } from '@/lib/ipfs'
import { Badge, Box, Button, Flex, Heading, HStack, Icon, Image, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LuArrowRightLeft, LuCheck, LuFilm, LuPin, LuSwords, LuUsers, LuX } from 'react-icons/lu'
import type { AnimeItem, PinServer } from '../types'
import { AnimeComparisonBlock } from './anime-comparison-block'

interface AnimeModerationCardProps {
  /** Данные аниме */
  anime: AnimeItem
  /** Список пин-серверов (для проверки доступности) */
  pinServers: PinServer[]
  /** Роль текущего пользователя */
  userRole: string
  /** Одобрить аниме */
  onApprove: () => void
  /** Одобрить и запинить */
  onApproveAndPin: () => void
  /** Одобрить замену */
  onApproveReplacement: () => void
  /** Одобрить замену и запинить */
  onApproveReplacementAndPin: () => void
  /** Отклонить аниме */
  onReject: () => void
}

/** Карточка модерации аниме */
export function AnimeModerationCard({
  anime,
  pinServers,
  userRole,
  onApprove,
  onApproveAndPin,
  onApproveReplacement,
  onApproveReplacementAndPin,
  onReject,
}: AnimeModerationCardProps) {
  const router = useRouter()
  const [pinning, setPinning] = useState(false)
  const coverUrl = anime.coverUrl ? resolveImageUrl(anime.coverUrl) : null
  const hasOnlineServers = pinServers.some((s) => s.status === 'ONLINE')

  /** Ручной пиннинг аниме на сервер */
  const handlePin = async () => {
    setPinning(true)
    try {
      const res = await fetch(`/api/admin/pin/${anime.id}`, { method: 'POST' })
      if (res.ok) {
        toaster.success({ title: 'Пиннинг запущен' })
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toaster.error({ title: data.error || 'Ошибка пиннинга' })
      }
    } catch {
      toaster.error({ title: 'Ошибка сети' })
    } finally {
      setPinning(false)
    }
  }

  const isReplacement = anime.replacesAnime !== null

  return (
    <Box
      bg="bg.panel"
      p={6}
      borderRadius="xl"
      borderWidth="1px"
      borderColor={isReplacement ? 'orange.300' : undefined}
      _dark={isReplacement ? { borderColor: 'orange.700' } : undefined}
    >
      <Flex gap={6} direction={{ base: 'column', md: 'row' }}>
        {/* Постер */}
        {coverUrl && (
          <Box w={{ base: '100%', md: '140px' }} flexShrink={0}>
            <Image src={coverUrl} alt={anime.title} borderRadius="lg" objectFit="cover" aspectRatio="2/3" />
          </Box>
        )}

        {/* Информация */}
        <Box flex={1}>
          <HStack justify="space-between" mb={2}>
            <VStack align="flex-start" gap={0}>
              <Heading size="md">{anime.title}</Heading>
              {anime.titleOriginal && (
                <Text fontSize="sm" color="fg.muted">
                  {anime.titleOriginal}
                </Text>
              )}
            </VStack>
            <HStack gap={2}>
              {isReplacement && (
                <Badge colorPalette="orange">
                  <Icon as={LuArrowRightLeft} mr={1} />
                  Замена
                </Badge>
              )}
              <Badge colorPalette="yellow">На модерации</Badge>
              {anime.competingCount !== undefined && anime.competingCount > 0 && (
                <Badge colorPalette="red" variant="subtle">
                  <Icon as={LuSwords} mr={1} />
                  {anime.competingCount} конкурент
                  {anime.competingCount === 1 ? '' : anime.competingCount < 5 ? 'а' : 'ов'}
                </Badge>
              )}
            </HStack>
          </HStack>

          <VStack align="flex-start" gap={2} mb={4}>
            <HStack gap={2} flexWrap="wrap">
              {anime.year && <Badge>{anime.year}</Badge>}
              {anime.studio && <Badge colorPalette="purple">{anime.studio}</Badge>}
              {anime.genres.map((g) => (
                <Badge key={g} colorPalette="accent">
                  {g}
                </Badge>
              ))}
              <Badge colorPalette="blue">
                <Icon as={LuFilm} mr={1} />
                {anime.episodes.length} эп.
              </Badge>
              {anime.shikimoriId && <Badge colorPalette="teal">Shikimori: {anime.shikimoriId}</Badge>}
            </HStack>

            {anime.directoryCid && (
              <Text fontSize="xs" color="fg.muted">
                Directory CID:{' '}
                <a
                  href={`${
                    process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.letar.best'
                  }/ipfs/${anime.directoryCid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'underline' }}
                >
                  <code>{anime.directoryCid.slice(0, 24)}...</code>
                </a>
                {anime.directorySize ? ` · ${formatFileSize(anime.directorySize)}` : ''}
              </Text>
            )}

            <HStack gap={2}>
              <Icon as={LuUsers} />
              <NextLink href={`/profile/${anime.uploadedBy.id}`}>
                <Text fontSize="sm" _hover={{ color: 'brand.500', textDecoration: 'underline' }}>
                  {anime.uploadedBy.name || anime.uploadedBy.email || 'Аноним'}
                </Text>
              </NextLink>
              <Text fontSize="xs" color="fg.muted">
                · {new Date(anime.createdAt).toLocaleString('ru')}
              </Text>
            </HStack>
          </VStack>

          {/* Блок сравнения (если это замена) */}
          {isReplacement && anime.replacesAnime && (
            <Box mb={4}>
              <AnimeComparisonBlock current={anime.replacesAnime} replacement={anime} />
            </Box>
          )}

          {/* Действия */}
          <ModerationActions
            isReplacement={isReplacement}
            userRole={userRole}
            hasOnlineServers={hasOnlineServers}
            pinning={pinning}
            directoryCid={anime.directoryCid}
            replacesShikimoriId={anime.replacesAnime?.shikimoriId ?? null}
            onApprove={onApprove}
            onApproveAndPin={onApproveAndPin}
            onApproveReplacement={onApproveReplacement}
            onApproveReplacementAndPin={onApproveReplacementAndPin}
            onReject={onReject}
            onPin={handlePin}
          />
        </Box>
      </Flex>
    </Box>
  )
}

/** Кнопки действий модерации */
function ModerationActions({
  isReplacement,
  userRole,
  hasOnlineServers,
  pinning,
  directoryCid,
  replacesShikimoriId,
  onApprove,
  onApproveAndPin,
  onApproveReplacement,
  onApproveReplacementAndPin,
  onReject,
  onPin,
}: {
  isReplacement: boolean
  userRole: string
  hasOnlineServers: boolean
  pinning: boolean
  /** Directory CID аниме-кандидата для просмотра страницы в трекере */
  directoryCid: string | null
  /** shikimoriId текущей (замещаемой) раздачи для ссылки на страницу трекера */
  replacesShikimoriId: number | null
  onApprove: () => void
  onApproveAndPin: () => void
  onApproveReplacement: () => void
  onApproveReplacementAndPin: () => void
  onReject: () => void
  onPin: () => void
}) {
  return (
    <HStack gap={2} flexWrap="wrap">
      {/* Просмотр страницы аниме в трекере (по directoryCid) */}
      {directoryCid && (
        <Button asChild variant="outline" size="sm">
          <NextLink href={`/anime/${directoryCid}`} target="_blank">
            Просмотреть
          </NextLink>
        </Button>
      )}
      {/* Ссылка на текущую раздачу в трекере (по shikimoriId) */}
      {isReplacement && replacesShikimoriId && (
        <Button asChild variant="ghost" size="sm">
          <NextLink href={`/anime/${replacesShikimoriId}`} target="_blank">
            Текущая раздача
          </NextLink>
        </Button>
      )}

      {/* Кнопки замены (если это кандидат на замену) */}
      {isReplacement ? (
        <>
          <Button colorPalette="orange" variant="outline" size="sm" onClick={onApproveReplacement}>
            <Icon as={LuArrowRightLeft} mr={2} />
            Одобрить замену
          </Button>
          {userRole === 'ADMIN' && (
            <Button colorPalette="orange" size="sm" onClick={onApproveReplacementAndPin} disabled={!hasOnlineServers}>
              <Icon as={LuArrowRightLeft} mr={1} />
              <Icon as={LuPin} mr={1} />
              Замена + запинить
            </Button>
          )}
        </>
      ) : (
        <>
          <Button colorPalette="green" variant="outline" size="sm" onClick={onApprove}>
            <Icon as={LuCheck} mr={2} />
            Одобрить
          </Button>
          {userRole === 'ADMIN' && (
            <Button colorPalette="green" size="sm" onClick={onApproveAndPin} disabled={!hasOnlineServers}>
              <Icon as={LuCheck} mr={1} />
              <Icon as={LuPin} mr={1} />
              Одобрить + запинить
            </Button>
          )}
        </>
      )}

      <Button colorPalette="red" variant="outline" size="sm" onClick={onReject}>
        <Icon as={LuX} mr={2} />
        Отклонить
      </Button>
      {userRole === 'ADMIN' && (
        <Button
          colorPalette="blue"
          variant="outline"
          size="sm"
          onClick={onPin}
          loading={pinning}
          disabled={!hasOnlineServers}
        >
          <Icon as={LuPin} mr={2} />
          Запинить
        </Button>
      )}
    </HStack>
  )
}
