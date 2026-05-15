import { NavLink } from '@/app/_components/nav-link'
import { Box, Container, Separator, Text, VStack, Wrap } from '@chakra-ui/react'
import type { ReactNode } from 'react'

/** Навигация между юридическими документами */
const legalLinks = [
  { href: '/legal/terms', label: 'Пользовательское соглашение' },
  { href: '/legal/privacy', label: 'Политика конфиденциальности' },
  { href: '/legal/offer', label: 'Публичная оферта' },
  { href: '/legal/returns', label: 'Политика возврата' },
  { href: '/legal/seller-agreement', label: 'Для продавцов' },
  { href: '/legal/consent', label: 'Согласие на обработку ПД' },
  { href: '/legal/product-listing-rules', label: 'Правила размещения товаров' },
  { href: '/legal/dispute-resolution', label: 'Регламент споров' },
  { href: '/legal/promotions', label: 'Правила промоакций' },
  { href: '/legal/reconciliation-template', label: 'Акт сверки (шаблон)' },
]

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <Box>
      <Container maxW="3xl" py={8}>
        {/* Пометка о проекте документа */}
        <Box bg="yellow.50" borderWidth={1} borderColor="yellow.200" borderRadius="md" p={4} mb={8}>
          <Text fontSize="sm" color="yellow.800" fontWeight="medium">
            Проект документа. Подлежит проверке юристом перед вступлением в силу.
          </Text>
          <Text fontSize="xs" color="yellow.600" mt={1}>
            Дата последнего обновления: 18 марта 2026 г.
          </Text>
        </Box>

        {children}

        {/* Навигация между документами */}
        <Separator my={8} />
        <VStack gap={4}>
          <Text fontSize="sm" fontWeight="medium" color="fg.muted">
            Другие документы
          </Text>
          <Wrap gap={3} justify="center">
            {legalLinks.map((link) => (
              <NavLink key={link.href} href={link.href} fontSize="sm" style={{ color: 'inherit' }}>
                {link.label}
              </NavLink>
            ))}
          </Wrap>
        </VStack>
      </Container>
    </Box>
  )
}
