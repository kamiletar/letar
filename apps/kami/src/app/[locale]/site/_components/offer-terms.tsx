import { Link } from '@/i18n/navigation'
import { formatOfferPrice, OFFER } from '@/lib/offer'
import { Box, Container, Heading, Link as ChakraLink, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { getLocale, getTranslations } from 'next-intl/server'

/** Карточки условий; карточка без цифры (null) не выводится. */
export async function OfferTerms() {
  const locale = await getLocale()
  const t = await getTranslations('site')
  const cards: { key: string; label: string; value: string; friends?: boolean }[] = []
  if (OFFER.priceFromRub !== null) {
    cards.push({
      key: 'price',
      label: t('terms.priceLabel'),
      value: t('terms.priceValue', { price: formatOfferPrice(locale, OFFER.priceFromRub) }),
    })
  }
  if (OFFER.weeksFrom !== null) {
    cards.push({ key: 'weeks', label: t('terms.weeksLabel'), value: t('terms.weeksValue', { weeks: OFFER.weeksFrom }) })
  }
  if (OFFER.freeFirstCall) {
    cards.push({ key: 'call', label: t('terms.firstCallLabel'), value: t('terms.firstCallValue') })
  }
  if (OFFER.stagedPayment) {
    cards.push({ key: 'staged', label: t('terms.stagedLabel'), value: t('terms.stagedValue') })
  }
  if (OFFER.friendsDiscountPercent !== null) {
    cards.push({
      key: 'discount',
      label: t('terms.discountLabel'),
      value: t('terms.discountValue', { percent: OFFER.friendsDiscountPercent }),
      friends: true,
    })
  }
  if (cards.length === 0) { return null }

  return (
    <Box py={{ base: 8, md: 12 }}>
      <Container maxW="5xl" px={{ base: 6, md: 12 }}>
        <Stack asChild gap={5}>
          <section aria-labelledby="site-terms-title">
            <Heading asChild size="xl">
              <h2 id="site-terms-title">{t('termsTitle')}</h2>
            </Heading>
            <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} gap={3}>
              {cards.map((card) => (
                <Stack
                  key={card.key}
                  gap={1}
                  p={5}
                  borderRadius="md"
                  bg={{ base: 'white/45', _dark: 'bg/45' }}
                  backdropFilter="blur(12px) saturate(140%)"
                  borderWidth="1px"
                  borderColor={{ base: 'fg.700/20', _dark: 'fg.200/20' }}
                  shadow="sm"
                >
                  <Text fontSize="sm" color="fg.muted">{card.label}</Text>
                  <Text fontSize="xl" fontWeight="semibold">{card.value}</Text>
                  {card.friends && (
                    <ChakraLink
                      asChild
                      minH="44px"
                      display="inline-flex"
                      alignItems="center"
                      fontSize="sm"
                      color="fg.muted"
                    >
                      <Link href="/#friends">{t('terms.discountLink')}</Link>
                    </ChakraLink>
                  )}
                </Stack>
              ))}
            </SimpleGrid>
            {/* Цифры на сайте — ориентир, не публичная оферта (KM-033) */}
            {OFFER.priceFromRub !== null && <Text fontSize="sm" color="fg.muted">{t('terms.priceNote')}</Text>}
          </section>
        </Stack>
      </Container>
    </Box>
  )
}
