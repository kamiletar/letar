import { CONTACT } from '@/lib/utils/constants'
import { Box, Container, Heading, Link, Stack, Text } from '@chakra-ui/react'
import { CopyToClipboardButton } from '@letar/ui/copy-to-clipboard-button'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const nav = await getTranslations({ locale, namespace: 'nav' })
  const t = await getTranslations({ locale, namespace: 'contacts' })
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kami.letar.best'
  const path = locale === 'ru' ? '/contacts/' : '/en/contacts/'
  return {
    title: nav('contacts'),
    description: t('description'),
    alternates: {
      canonical: path,
      languages: { ru: '/contacts/', en: '/en/contacts/' },
    },
    openGraph: { title: nav('contacts'), description: t('description'), url: `${baseUrl}${path}` },
  }
}

/** Самостоятельная страница с прямыми ссылками и копированием контактов. */
export default async function ContactsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const nav = await getTranslations('nav')
  const t = await getTranslations('home')
  const contacts = [
    { label: 'Email', value: CONTACT.email, href: `mailto:${CONTACT.email}` },
    { label: 'Telegram', value: CONTACT.telegram, href: `https://t.me/${CONTACT.telegram.slice(1)}` },
  ]
  return (
    <Box py={{ base: 12, md: 20 }}>
      <Container maxW="4xl" px={{ base: 6, md: 12 }}>
        <Stack gap={8}>
          <Heading asChild size="3xl">
            <h1>{nav('contacts')}</h1>
          </Heading>
          <Stack gap={4}>
            {contacts.map((contact) => (
              <Stack
                key={contact.label}
                direction={{ base: 'column', sm: 'row' }}
                align={{ base: 'start', sm: 'center' }}
                justify="space-between"
                gap={2}
                p={5}
                bg="bg/90"
                borderWidth="1px"
                borderColor="border"
                borderRadius="md"
              >
                <Box minW={0}>
                  <Text fontSize="sm" color="fg.muted">{contact.label}</Text>
                  <Link
                    href={contact.href}
                    minH="44px"
                    fontSize={{ base: 'lg', md: 'xl' }}
                    color="fg"
                    overflowWrap="anywhere"
                  >
                    {contact.value}
                  </Link>
                </Box>
                <CopyToClipboardButton
                  text={contact.value}
                  label={t('copy', { contact: contact.label })}
                  copiedLabel={t('copied')}
                  minH="44px"
                  flexShrink={0}
                />
              </Stack>
            ))}
          </Stack>
        </Stack>
      </Container>
    </Box>
  )
}
