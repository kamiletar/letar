import { mainNavItems } from '@/app/_components/main-nav-items'
import { NavLink } from '@/app/_components/nav-link'
import { Box, Button } from '@chakra-ui/react'

interface NavLinksProps {
  closeMenu?: () => void
}

/**
 * Навигационные ссылки для мобильного меню.
 * Используется в клиентском MobileMenu компоненте.
 */
export const NavLinks = ({ closeMenu }: NavLinksProps) => {
  return (
    <>
      {mainNavItems.map((item) => (
        <Button key={item.href} asChild variant="ghost" justifyContent="flex-start" size="lg" width="100%">
          <NavLink onClick={closeMenu} href={item.href}>
            <Box as="span" mr={2}>
              {item.icon}
            </Box>
            {item.label}
          </NavLink>
        </Button>
      ))}
    </>
  )
}
