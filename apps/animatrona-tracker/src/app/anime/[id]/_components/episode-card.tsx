'use client'

/**
 * Карточка эпизода с hover preview скриншотов, лайтбоксом и тех. инфо
 *
 * Портировано из десктопного EpisodeCard:
 * - Hover cycling (500ms интервал, переключение thumbnails)
 * - Slideshow (LightboxViewer с полными скриншотами)
 * - Encoding Info (диалог с данными кодирования из IPFS)
 * - Индикаторы-точки текущего preview
 */

import { getIpfsUrl } from '@/lib/ipfs'
import { Box, HStack, IconButton, Image } from '@chakra-ui/react'
import { EpisodeCardBase } from '@letar/animatrona-ui'
import { LightboxViewer } from '@letar/ui'
import Link from 'next/link'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LuExpand, LuInfo, LuLock, LuPlay } from 'react-icons/lu'

import { EncodingInfoDialog } from './encoding-info-dialog'

interface EpisodeCardProps {
  number: number
  name?: string
  /** Длительность в секундах */
  duration: number
  /** ID аниме в трекере для URL */
  animeSlug: string
  /** Процент просмотра (0-100) */
  watchPercent: number
  /** CID'ы thumbnails (320px WebP) для hover cycling */
  thumbnailCids?: string[]
  /** CID'ы скриншотов (1280px) для лайтбокса */
  screenshotCids?: string[]
  /** CID директории аниме в IPFS (для загрузки episode manifest) */
  directoryCid?: string | null
  /** Заблокирован ли эпизод (для неавторизованных пользователей) */
  isLocked?: boolean
}

export const EpisodeCard = memo(function EpisodeCard({
  number,
  name,
  duration,
  animeSlug,
  watchPercent,
  thumbnailCids = [],
  screenshotCids = [],
  directoryCid,
  isLocked,
}: EpisodeCardProps) {
  const isCompleted = watchPercent >= 90
  const href = isLocked ? '/sign-in' : `/watch/${animeSlug}/${number}`

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovering, setIsHovering] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [encodingInfoOpen, setEncodingInfoOpen] = useState(false)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Hover preview — переключаем скриншоты каждые 500ms
  useEffect(() => {
    if (isHovering && thumbnailCids.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % thumbnailCids.length)
      }, 500)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setCurrentIndex(0)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isHovering, thumbnailCids.length])

  // Открыть лайтбокс
  const handleScreenshotClick = useCallback(
    (e: React.MouseEvent) => {
      if (screenshotCids.length > 0) {
        e.preventDefault()
        e.stopPropagation()
        setLightboxIndex(currentIndex)
        setLightboxOpen(true)
      }
    },
    [currentIndex, screenshotCids.length],
  )

  // Открыть диалог тех. инфо
  const handleInfoClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setEncodingInfoOpen(true)
  }, [])

  // Текущий thumbnail для отображения
  const currentThumbnail = thumbnailCids[currentIndex] || thumbnailCids[0]
  const thumbnailUrl = currentThumbnail ? getIpfsUrl(currentThumbnail) : null

  // Слайды для лайтбокса
  const lightboxSlides = useMemo(
    () =>
      screenshotCids.map((cid, i) => ({
        src: getIpfsUrl(cid),
        alt: `Эпизод ${number} — кадр ${i + 1}`,
      })),
    [screenshotCids, number],
  )

  return (
    <>
      <EpisodeCardBase
        number={number}
        name={isLocked ? '🔒 Войдите для просмотра' : name}
        duration={duration}
        watchProgress={isLocked ? 0 : watchPercent}
        isCompleted={isCompleted}
        opacity={isLocked ? 0.6 : 1}
        hoverBorderColor={isLocked ? 'yellow.500' : 'purple.500'}
        thumbnailSlot={thumbnailUrl
          ? <Image src={thumbnailUrl} alt={`Эпизод ${number}`} loading="lazy" w="100%" h="100%" objectFit="cover" />
          : undefined}
        overlaySlot={isLocked && thumbnailUrl
          ? (
            <Box
              position="absolute"
              inset={0}
              bg="blackAlpha.600"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <LuLock size={32} color="white" />
            </Box>
          )
          : !isLocked && isHovering && thumbnailUrl
          ? (
            <Box
              position="absolute"
              inset={0}
              bg="blackAlpha.500"
              display="flex"
              alignItems="center"
              justifyContent="center"
              gap={3}
            >
              {/* Кнопка Play */}
              <IconButton aria-label="Смотреть" size="lg" colorPalette="purple" borderRadius="full" asChild>
                <Link href={href}>
                  <LuPlay size={24} />
                </Link>
              </IconButton>

              {/* Кнопка Slideshow */}
              {screenshotCids.length > 0 && (
                <IconButton
                  aria-label="Скриншоты"
                  size="sm"
                  variant="outline"
                  colorPalette="whiteAlpha"
                  borderRadius="full"
                  onClick={handleScreenshotClick}
                >
                  <LuExpand size={16} />
                </IconButton>
              )}

              {/* Кнопка Info */}
              {directoryCid && (
                <IconButton
                  aria-label="Информация о кодировании"
                  size="sm"
                  variant="outline"
                  colorPalette="whiteAlpha"
                  borderRadius="full"
                  onClick={handleInfoClick}
                >
                  <LuInfo size={16} />
                </IconButton>
              )}
            </Box>
          )
          : undefined}
        wrapper={(children) => (
          <Box onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
            <Link href={href} style={{ textDecoration: 'none' }}>
              {children}
            </Link>

            {/* Индикаторы-точки */}
            {thumbnailCids.length > 1 && isHovering && (
              <HStack
                position="absolute"
                bottom="30px"
                left="50%"
                transform="translateX(-50%)"
                gap={1}
                zIndex={10}
                pointerEvents="none"
              >
                {thumbnailCids.map((_, i) => (
                  <Box
                    key={i}
                    w={1.5}
                    h={1.5}
                    borderRadius="full"
                    bg={i === currentIndex ? 'white' : 'whiteAlpha.500'}
                    transition="background 0.2s"
                  />
                ))}
              </HStack>
            )}
          </Box>
        )}
      />

      {/* Лайтбокс для полноэкранного просмотра скриншотов */}
      {lightboxSlides.length > 0 && (
        <LightboxViewer
          open={lightboxOpen}
          index={lightboxIndex}
          close={() => setLightboxOpen(false)}
          slides={lightboxSlides}
        />
      )}

      {/* Диалог информации о кодировании */}
      {directoryCid && (
        <EncodingInfoDialog
          open={encodingInfoOpen}
          onOpenChange={setEncodingInfoOpen}
          episodeNumber={number}
          directoryCid={directoryCid}
        />
      )}
    </>
  )
})
