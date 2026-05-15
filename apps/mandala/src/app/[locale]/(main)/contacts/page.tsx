export const dynamic = 'force-dynamic'

import { JsonLd, localBusinessSchema } from '@/app/_components/json-ld'
import { Box, Container, Heading, Link, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { LuMail, LuMessageCircle } from 'react-icons/lu'
import { ContactForm } from './_components/contact-form'

export const metadata: Metadata = {
  title: 'Контакты',
  description: 'Свяжитесь с художницей Эльфафеей. Форма обратной связи, email и социальные сети.',
  alternates: {
    canonical: '/contacts',
  },
  openGraph: {
    title: 'Контакты',
    description: 'Свяжитесь с художницей Эльфафеей',
  },
}

export default function ContactsPage() {
  return (
    <>
      <JsonLd data={localBusinessSchema} />
      <Container maxW="85ch" py={{ base: 4, md: 8 }} px={{ base: 4, md: 6 }}>
        <Heading as="h1" size={{ base: 'xl', md: '2xl' }} color="fg" mb={{ base: 4, md: 8 }}>
          Контакты
        </Heading>

        <VStack gap={{ base: 6, md: 8 }} align="stretch">
          {/* Информация о контактах */}
          <Box>
            <Text fontSize={{ base: 'md', md: 'lg' }} color="fg.muted" mb={4}>
              Если у вас есть вопросы о мандалах, товарах или вы хотите заказать индивидуальную работу — напишите мне!
            </Text>

            <VStack align="flex-start" gap={2} color="fg.muted">
              <Link
                href="mailto:elfafeya@gmail.com"
                display="flex"
                alignItems="center"
                gap={2}
                color="fg"
                _hover={{ color: 'fg.brand' }}
              >
                <LuMail />
                elfafeya@gmail.com
              </Link>
              <Link
                href="https://t.me/elfafeya"
                target="_blank"
                rel="noopener noreferrer"
                display="flex"
                alignItems="center"
                gap={2}
                color="fg"
                _hover={{ color: 'fg.brand' }}
              >
                <LuMessageCircle />
                @elfafeya в Telegram
              </Link>
            </VStack>
          </Box>

          {/* Форма обратной связи */}
          <Box
            bg={{ _light: 'blackAlpha.50', _dark: 'whiteAlpha.50' }}
            borderRadius="lg"
            p={{ base: 4, md: 6 }}
            borderWidth="1px"
            borderColor="border.subtle"
          >
            <Heading as="h2" size={{ base: 'md', md: 'lg' }} color="fg" mb={4}>
              Напишите мне
            </Heading>
            <ContactForm />
          </Box>
        </VStack>
      </Container>
    </>
  )
}
