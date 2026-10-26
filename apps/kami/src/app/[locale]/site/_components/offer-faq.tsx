import { Box, Container, Heading, Stack, Text } from '@chakra-ui/react'
import { getTranslations } from 'next-intl/server'

/** FAQ на нативных `<details>`: работает с клавиатуры и без JS. */
export async function OfferFaq() {
  const t = await getTranslations('site')
  const items = t.raw('faq') as { q: string; a: string }[]
  return (
    <Box py={{ base: 8, md: 12 }}>
      <Container maxW="3xl" px={{ base: 6, md: 12 }}>
        <Stack asChild gap={4}>
          <section aria-labelledby="site-faq-title">
            <Heading asChild size="xl">
              <h2 id="site-faq-title">{t('faqTitle')}</h2>
            </Heading>
            <Stack gap={2}>
              {items.map((item) => (
                <Box
                  asChild
                  key={item.q}
                  borderRadius="md"
                  bg={{ base: 'white/45', _dark: 'bg/45' }}
                  backdropFilter="blur(12px) saturate(140%)"
                  borderWidth="1px"
                  borderColor={{ base: 'fg.700/20', _dark: 'fg.200/20' }}
                  css={{
                    '& > summary': {
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      minHeight: '48px',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      listStyle: 'none',
                      fontWeight: 600,
                      borderRadius: 'inherit',
                    },
                    '& > summary::-webkit-details-marker': { display: 'none' },
                    '& > summary::after': { content: '"+"', fontFamily: 'var(--font-mono)', flexShrink: 0 },
                    '&[open] > summary::after': { content: '"−"' },
                    '& > summary:focus-visible': { outline: '2px solid currentColor', outlineOffset: '2px' },
                  }}
                >
                  <details>
                    <summary>{item.q}</summary>
                    <Text px={4} pb={4} color="fg.muted" lineHeight="tall" textWrap="pretty">{item.a}</Text>
                  </details>
                </Box>
              ))}
            </Stack>
          </section>
        </Stack>
      </Container>
    </Box>
  )
}
