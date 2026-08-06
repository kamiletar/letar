'use client'

/**
 * Базовый компонент Hero секции страницы аниме
 *
 * Содержит общую структуру для tracker, web и desktop:
 * - Двуслойный blurred background
 * - Gradient overlays
 * - Постер с лайтбоксом (кликабельный)
 * - Название, оригинальное название
 * - Слоты для бейджей, метаданных, CTA
 */

import { Box, Flex, Heading, Icon, Image, Text, VStack } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { LuPlay } from 'react-icons/lu'

import { PosterLightbox } from './PosterLightbox'

export interface AnimeHeroBaseProps {
  /** Название аниме */
  name: string
  /** Оригинальное название */
  originalName?: string | null
  /** URL постера */
  posterUrl?: string | null
  /** Описание (не отображается напрямую, но доступно для SEO) */
  description?: string | null
  /** Слот для бейджей (статус, рейтинг, тип, возрастной рейтинг) */
  badgesSlot?: ReactNode
  /** Слот для метаданных (год, эпизоды, длительность, размер) */
  metaSlot?: ReactNode
  /** Слот для жанров/тем */
  tagsSlot?: ReactNode
  /** Слот для CTA кнопок (смотреть, action menu) */
  ctaSlot?: ReactNode
  /** Слот для дополнительного контента на постере (progress bar) */
  posterOverlaySlot?: ReactNode
}

/** Базовый Hero компонент — layout + background + lightbox */
export function AnimeHeroBase({
  name,
  originalName,
  posterUrl,
  badgesSlot,
  metaSlot,
  tagsSlot,
  ctaSlot,
  posterOverlaySlot,
}: AnimeHeroBaseProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  return (
    <Box position="relative" minH="280px" overflow="hidden">
      {/* Blurred background — двуслойный "wow" эффект */}
      {posterUrl && (
        <>
          <Image
            src={posterUrl}
            position="absolute"
            inset={0}
            w="full"
            h="full"
            objectFit="cover"
            filter="blur(60px) saturate(1.8) brightness(1.1)"
            transform="scale(1.4)"
            opacity={0.5}
            alt=""
          />
          <Image
            src={posterUrl}
            position="absolute"
            inset={0}
            w="full"
            h="full"
            objectFit="cover"
            filter="blur(100px) saturate(2) brightness(0.8)"
            transform="scale(1.6)"
            opacity={0.3}
            alt=""
          />
        </>
      )}

      {/* Gradient overlays */}
      <Box position="absolute" inset={0} bgGradient="to-t" gradientFrom="bg" gradientVia="bg/80" gradientTo="bg/30" />
      <Box
        position="absolute"
        inset={0}
        bgGradient="to-r"
        gradientFrom="bg/60"
        gradientVia="transparent"
        gradientTo="bg/40"
      />

      {/* Content */}
      <Flex
        position="relative"
        h="full"
        minH="280px"
        align="center"
        px={{ base: 4, md: 6, lg: 8 }}
        py={6}
        gap={{ base: 4, md: 6 }}
        flexDir={{ base: 'column', sm: 'row' }}
      >
        {/* Постер */}
        <Box position="relative" flexShrink={0}>
          {posterUrl
            ? (
              <Image
                src={posterUrl}
                w={{ base: '140px', md: '160px', lg: '180px' }}
                borderRadius="lg"
                shadow="2xl"
                alt={name}
                cursor="pointer"
                onClick={() => setIsLightboxOpen(true)}
                transition="transform 0.2s, box-shadow 0.2s"
                _hover={{ transform: 'scale(1.02)', shadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)' }}
                title="Нажмите для просмотра в полном размере"
              />
            )
            : (
              <Box
                w={{ base: '140px', md: '160px', lg: '180px' }}
                aspectRatio={2 / 3}
                bg="bg.subtle"
                borderRadius="lg"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Icon as={LuPlay} boxSize={12} color="fg.subtle" />
              </Box>
            )}

          {/* Оверлей на постере (progress bar и т.д.) */}
          {posterOverlaySlot}
        </Box>

        {/* Информация */}
        <VStack align={{ base: 'center', sm: 'start' }} gap={2} flex={1} textAlign={{ base: 'center', sm: 'left' }}>
          {/* Бейджи */}
          {badgesSlot}

          {/* Название */}
          <Heading size={{ base: 'lg', md: 'xl', lg: '2xl' }} lineClamp={2}>
            {name}
          </Heading>

          {originalName && (
            <Text color="fg.muted" fontSize={{ base: 'sm', md: 'md' }} lineClamp={1}>
              {originalName}
            </Text>
          )}

          {/* Метаданные */}
          {metaSlot}

          {/* Жанры/темы */}
          {tagsSlot}

          {/* CTA кнопки */}
          {ctaSlot}
        </VStack>
      </Flex>

      {/* Лайтбокс постера */}
      {posterUrl && (
        <PosterLightbox posterUrl={posterUrl} name={name} open={isLightboxOpen} onOpenChange={setIsLightboxOpen} />
      )}
    </Box>
  )
}
