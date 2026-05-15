import { Link } from '@/i18n/navigation'
import { Box, Link as ChakraLink, VStack } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { LuArrowLeft } from 'react-icons/lu'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('auth')

  return (
    <VStack minH="100vh" bg="bg.subtle" display="flex" alignItems="center" justifyContent="center">
      <ChakraLink
        asChild
        colorPalette="brand"
        display="inline-flex"
        alignItems="center"
        gap={1}
        px={4}
        py={4}
        alignSelf="flex-start"
      >
        <Link href="/">
          <LuArrowLeft />
          {t('backToHome')}
        </Link>
      </ChakraLink>
      <Box flex={1} display="flex" alignItems="center" justifyContent="center" w="full">
        {children}
      </Box>
    </VStack>
  )
}
