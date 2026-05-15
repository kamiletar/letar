import { Link } from '@/i18n/navigation'
import { Button, Container, Heading, Text, VStack } from '@chakra-ui/react'
import { Home } from 'lucide-react'
import { useTranslations } from 'next-intl'

/** Страница 404 */
export default function NotFound() {
  const t = useTranslations('notFound')

  return (
    <Container maxW="lg" py={{ base: 20, md: 32 }}>
      <VStack gap={6} textAlign="center">
        <Text fontSize="8xl" fontWeight="bold" color="fg.muted" lineHeight={1}>
          404
        </Text>
        <Heading as="h1" size="2xl">
          {t('title')}
        </Heading>
        <Text color="fg.muted" fontSize="lg">
          {t('description')}
        </Text>
        <Button asChild size="lg" mt={4}>
          <Link href="/">
            <Home size={18} />
            {t('backHome')}
          </Link>
        </Button>
      </VStack>
    </Container>
  )
}
