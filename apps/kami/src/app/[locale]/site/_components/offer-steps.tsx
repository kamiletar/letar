import { Box, Container, Heading, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { getTranslations } from 'next-intl/server'

/** Три шага работы. */
export async function OfferSteps() {
  const t = await getTranslations('site')
  const steps = t.raw('steps') as { title: string; text: string }[]
  return (
    <Box py={{ base: 8, md: 12 }}>
      <Container maxW="5xl" px={{ base: 6, md: 12 }}>
        <Stack asChild gap={5}>
          <section aria-labelledby="site-steps-title">
            <Heading asChild size="xl">
              <h2 id="site-steps-title">{t('stepsTitle')}</h2>
            </Heading>
            <SimpleGrid asChild columns={{ base: 1, md: 3 }} gap={3}>
              <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {steps.map((step, i) => (
                  <Stack
                    asChild
                    key={step.title}
                    gap={2}
                    p={5}
                    borderRadius="md"
                    bg={{ base: 'white/45', _dark: 'bg/45' }}
                    backdropFilter="blur(12px) saturate(140%)"
                    borderWidth="1px"
                    borderColor={{ base: 'fg.700/20', _dark: 'fg.200/20' }}
                  >
                    <li>
                      <Text fontFamily="mono" fontSize="sm" color="fg.muted">{String(i + 1).padStart(2, '0')}</Text>
                      <Text fontSize="lg" fontWeight="semibold">{step.title}</Text>
                      <Text color="fg.muted" lineHeight="tall" textWrap="pretty">{step.text}</Text>
                    </li>
                  </Stack>
                ))}
              </ol>
            </SimpleGrid>
          </section>
        </Stack>
      </Container>
    </Box>
  )
}
