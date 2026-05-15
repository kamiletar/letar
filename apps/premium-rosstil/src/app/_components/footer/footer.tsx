import { NavLink } from '@/app/_components/nav-link'
import { SocialLinks } from '@/app/_components/social-links'
import { Box, Stack, Text, VStack } from '@chakra-ui/react'
import { NewsletterForm } from './newsletter-form'

export const Footer = () => {
  return (
    <footer style={{ marginTop: 'auto' }}>
      <Box>
        <Box textAlign={'center'} bg={'fg.emphasized'} py={10} paddingX={4} color={'white'}>
          <Stack
            direction={{
              mdDown: 'column',
              lgTo2xl: 'row',
            }}
            gap={4}
            alignItems={'center'}
          >
            <Box width={{ mdTo2xl: '200px' }}>
              <VStack gap={4}>
                <SocialLinks size="xl" gap={6} color="white" />
                <NewsletterForm />
              </VStack>
            </Box>
            <Box flex={'1'}>
              <Text>© 2025 Премиум Росстиль</Text>
              <Text>Создано для бренда дизайнерской одежды премиум-класса</Text>
            </Box>
            {/* Документы */}
            <Box>
              <VStack width={{ mdTo2xl: '220px' }}>
                <NavLink href={'/legal/terms'} style={{ color: 'white' }}>
                  Пользовательское соглашение
                </NavLink>
                <NavLink href={'/legal/privacy'} style={{ color: 'white' }}>
                  Политика конфиденциальности
                </NavLink>
                <NavLink href={'/legal/offer'} style={{ color: 'white' }}>
                  Публичная оферта
                </NavLink>
                <NavLink href={'/legal/returns'} style={{ color: 'white' }}>
                  Политика возврата
                </NavLink>
                <NavLink href={'/legal/seller-agreement'} style={{ color: 'white' }}>
                  Для продавцов
                </NavLink>
                <NavLink href={'/legal/dispute-resolution'} style={{ color: 'white' }}>
                  Регламент споров
                </NavLink>
              </VStack>
            </Box>
            {/* Навигация */}
            <Box>
              <VStack width={{ mdTo2xl: '142px' }}>
                <NavLink href={'/requisites'} style={{ color: 'white' }}>
                  Реквизиты
                </NavLink>
                <NavLink href={'/how-to-buy'} style={{ color: 'white' }}>
                  Как Купить
                </NavLink>
                <NavLink href={'/size-calculator'} style={{ color: 'white' }}>
                  Калькулятор Размеров
                </NavLink>
                <NavLink href={'/delivery'} style={{ color: 'white' }}>
                  Доставка
                </NavLink>
              </VStack>
            </Box>
          </Stack>
        </Box>
      </Box>
    </footer>
  )
}
