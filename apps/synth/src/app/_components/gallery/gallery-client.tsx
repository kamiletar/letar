'use client'

import { renderPatchToWav } from '@/lib/audio/render'
import type { Patch } from '@/lib/patch/schema'
import { Box, Container, Heading, Link, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import type React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { PressableCta } from '../pressable-cta'

interface GalleryClientProps {
  patches: Patch[]
}

const btnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #5a3a10',
  borderRadius: '4px',
  color: '#D4AF37',
  cursor: 'pointer',
  fontSize: '11px',
  padding: '4px 10px',
  letterSpacing: '0.04em',
}

const TYPE_LABEL: Record<Patch['type'], string> = {
  subtractive: 'SUB',
  fm: 'FM',
  drumkit: 'DRUM',
}

export function GalleryClient({ patches }: GalleryClientProps) {
  const [renderingId, setRenderingId] = useState<string | null>(null)
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [highlighted, setHighlighted] = useState<string | null>(null)

  useEffect(() => {
    setHighlighted(window.location.hash.replace('#', '') || null)
  }, [])

  const handlePlay = useCallback(
    (patch: Patch) => {
      if (audioUrls[patch.id]) {
        return
      }
      setRenderingId(patch.id)
      void renderPatchToWav(patch)
        .then((blob) => {
          setAudioUrls((prev) => ({ ...prev, [patch.id]: URL.createObjectURL(blob) }))
        })
        .finally(() => setRenderingId(null))
    },
    [audioUrls],
  )

  const handleShare = useCallback((id: string) => {
    const url = `${window.location.origin}/gallery#${id}`
    void navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    })
  }, [])

  return (
    <Box asChild>
      <main>
        <Container maxW="3xl" py={{ base: 12, md: 20 }}>
          <VStack gap={6} align="stretch">
            <Link asChild fontSize="sm" color="fg.muted" _hover={{ color: 'fg' }}>
              <NextLink href="/">&larr; В студию</NextLink>
            </Link>

            <Heading size="xl">Витрина патчей</Heading>
            <Text color="fg.muted" fontSize="sm">
              Патчи, опубликованные автором — с прослушиванием прямо в браузере (детерминированный офлайн-рендер, см.
              {' '}
              PLAN.md).
            </Text>

            {patches.length === 0 && (
              <Text color="fg.subtle" fontSize="sm">
                Пока пусто — ни один патч ещё не опубликован.
              </Text>
            )}

            {patches.map((patch) => (
              <Box
                key={patch.id}
                id={patch.id}
                p={4}
                borderRadius="md"
                borderWidth="1px"
                borderColor={highlighted === patch.id ? 'accent.DEFAULT' : 'border.subtle'}
                bg="bg.surface"
                display="flex"
                flexDir="column"
                gap={3}
              >
                <Box display="flex" alignItems="center" gap={3}>
                  <Text fontSize="9px" color="accent.emphasized" letterSpacing="0.08em">
                    {TYPE_LABEL[patch.type]}
                  </Text>
                  <Text fontWeight="medium">{patch.name}</Text>
                </Box>
                {patch.tags.length > 0 && (
                  <Text fontSize="9px" color="fg.subtle" letterSpacing="0.04em">
                    {patch.tags.join(' · ')}
                  </Text>
                )}

                <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                  <PressableCta>
                    <button style={btnStyle} disabled={renderingId === patch.id} onClick={() => handlePlay(patch)}>
                      {renderingId === patch.id ? '… рендер' : audioUrls[patch.id] ? '✓ готово' : '▶ прослушать'}
                    </button>
                  </PressableCta>
                  <PressableCta>
                    <button style={btnStyle} onClick={() => handleShare(patch.id)}>
                      {copiedId === patch.id ? '✓ ссылка скопирована' : '🔗 поделиться'}
                    </button>
                  </PressableCta>
                </Box>

                {audioUrls[patch.id] && (
                  <audio controls src={audioUrls[patch.id]} style={{ width: '100%', height: '32px' }} />
                )}
              </Box>
            ))}
          </VStack>
        </Container>
      </main>
    </Box>
  )
}
