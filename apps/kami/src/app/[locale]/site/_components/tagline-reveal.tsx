'use client'

import { Box, Container } from '@chakra-ui/react'
import { useEffect, useRef } from 'react'

type Props = { lines: string[] }

/**
 * Tagline с пословной подсветкой при прокрутке. Без JS и при reduced-motion текст сразу полного
 * цвета: приглушённое состояние выставляет только эффект, атрибутом на секции.
 */
export function TaglineReveal({ lines }: Props) {
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return }
    const words = Array.from(root.querySelectorAll<HTMLElement>('[data-w]'))
    let frame = 0
    const update = () => {
      frame = 0
      const line = window.innerHeight * 0.6
      for (const word of words) {
        if (word.getBoundingClientRect().top < line) {
          word.setAttribute('data-lit', '')
        } else {
          word.removeAttribute('data-lit')
        }
      }
    }
    const onScroll = () => {
      if (!frame) { frame = requestAnimationFrame(update) }
    }
    root.setAttribute('data-armed', '')
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) { cancelAnimationFrame(frame) }
      root.removeAttribute('data-armed')
    }
  }, [])

  return (
    <Box py={{ base: 16, md: 28 }}>
      <Container maxW="4xl" px={{ base: 6, md: 12 }}>
        <Box
          asChild
          css={{
            '& [data-w]': { transition: 'opacity 300ms cubic-bezier(0.22, 1, 0.36, 1)' },
            '&[data-armed] [data-w]:not([data-lit])': { opacity: 0.3 },
          }}
        >
          <section ref={rootRef} aria-label={lines.join(' ')}>
            {lines.map((line, i) => (
              <Box
                key={line}
                aria-hidden
                fontSize={{ base: '2xl', md: '4xl' }}
                fontWeight="semibold"
                lineHeight={1.3}
                textWrap="balance"
                mt={i === 0 ? 0 : 3}
              >
                {line.split(' ').map((word, j) => (
                  <span key={j}>
                    {j > 0 && ' '}
                    <span data-w>{word}</span>
                  </span>
                ))}
              </Box>
            ))}
          </section>
        </Box>
      </Container>
    </Box>
  )
}
