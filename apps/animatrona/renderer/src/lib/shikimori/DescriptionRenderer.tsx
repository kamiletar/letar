'use client'

import { Box, Link, Text } from '@chakra-ui/react'
import NextLink from 'next/link'
import { Fragment, useState } from 'react'
import { LuLibrary } from 'react-icons/lu'

import { type DescriptionSegment, parseDescription } from './parse-description'

/** Информация о локальном аниме */
export interface LocalAnimeInfo {
  id: string
  name: string
}

interface DescriptionRendererProps {
  /** Текст описания с тегами Shikimori */
  description: string
  /** Цвет текста */
  color?: string
  /** Размер шрифта */
  fontSize?: string
  /** Map shikimoriId → локальное аниме (для локальных ссылок) */
  localAnimeMap?: Map<number, LocalAnimeInfo>
}

/** Компонент для отображения спойлера */
function SpoilerText({ content }: { content: string }) {
  const [isRevealed, setIsRevealed] = useState(false)

  return (
    <Box
      as="span"
      bg={isRevealed ? 'transparent' : 'gray.700'}
      color={isRevealed ? 'inherit' : 'transparent'}
      px={1}
      borderRadius="sm"
      cursor="pointer"
      transition="all 0.2s"
      onClick={() => setIsRevealed(!isRevealed)}
      title={isRevealed ? 'Нажмите чтобы скрыть' : 'Нажмите чтобы показать спойлер'}
      _hover={{ opacity: 0.8 }}
    >
      {content}
    </Box>
  )
}

/** Рендерит один сегмент описания */
function renderSegment(segment: DescriptionSegment, index: number, localAnimeMap?: Map<number, LocalAnimeInfo>) {
  switch (segment.type) {
    case 'text':
      return <Fragment key={index}>{segment.content}</Fragment>

    case 'character':
    case 'person':
      // Персонажи и люди — просто выделенный текст
      return (
        <Text
          key={index}
          as="span"
          color="purple.300"
          fontWeight="medium"
          title={`${segment.type === 'character' ? 'Персонаж' : 'Человек'} #${segment.id}`}
        >
          {segment.name}
        </Text>
      )

    case 'anime': {
      // Проверяем есть ли аниме в локальной библиотеке
      const localAnime = localAnimeMap?.get(segment.id)

      if (localAnime) {
        // Локальная ссылка на библиотеку
        return (
          <Link key={index} asChild color="green.400" textDecoration="underline" _hover={{ color: 'green.300' }}>
            <NextLink href={`/library/${localAnime.id}`} title="Открыть в библиотеке">
              <LuLibrary style={{ display: 'inline', marginRight: '2px', verticalAlign: 'middle' }} />
              {segment.name}
            </NextLink>
          </Link>
        )
      }

      // Внешняя ссылка на Shikimori
      return (
        <Link
          key={index}
          href={`https://shikimori.one/animes/${segment.id}`}
          target="_blank"
          rel="noopener noreferrer"
          color="purple.400"
          textDecoration="underline"
          _hover={{ color: 'purple.300' }}
        >
          {segment.name}
        </Link>
      )
    }

    case 'manga':
      return (
        <Link
          key={index}
          href={`https://shikimori.one/mangas/${segment.id}`}
          target="_blank"
          rel="noopener noreferrer"
          color="blue.400"
          textDecoration="underline"
          _hover={{ color: 'blue.300' }}
        >
          {segment.name}
        </Link>
      )

    case 'bold':
      return (
        <Text key={index} as="span" fontWeight="bold">
          {segment.content}
        </Text>
      )

    case 'italic':
      return (
        <Text key={index} as="span" fontStyle="italic">
          {segment.content}
        </Text>
      )

    case 'spoiler':
      return <SpoilerText key={index} content={segment.content} />

    case 'link':
      return (
        <Link
          key={index}
          href={segment.url}
          target="_blank"
          rel="noopener noreferrer"
          color="blue.400"
          textDecoration="underline"
          _hover={{ color: 'blue.300' }}
        >
          {segment.text}
        </Link>
      )

    default:
      return null
  }
}

/**
 * Компонент для отображения описания аниме с парсингом тегов Shikimori
 */
export function DescriptionRenderer({
  description,
  color = 'fg.muted',
  fontSize = 'sm',
  localAnimeMap,
}: DescriptionRendererProps) {
  if (!description) {
    return null
  }

  const segments = parseDescription(description)

  return (
    <Text color={color} fontSize={fontSize} lineHeight="tall">
      {segments.map((segment, index) => renderSegment(segment, index, localAnimeMap))}
    </Text>
  )
}
