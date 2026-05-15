import { CatalogMenuServer } from '@/app/_components/header/catalog-menu-server'
import { mainNavItems } from '@/app/_components/main-nav-items'
import { NavLink } from '@/app/_components/nav-link'

/**
 * Навигационные ссылки для десктопной версии.
 * Server Component с поддержкой Mega Menu для каталога.
 */
export const NavLinksDesktop = async () => {
  return (
    <>
      {mainNavItems.map((item) => {
        // Для "Каталог" показываем Mega Menu
        if (item.href === '/catalog') {
          return <CatalogMenuServer key={item.href} />
        }

        return (
          <NavLink
            key={item.href}
            href={item.href}
            color="fg.muted"
            _hover={{ color: 'fg' }}
            px={4}
            py={2}
            fontSize="sm"
            textTransform="uppercase"
            letterSpacing="wider"
          >
            {item.label}
          </NavLink>
        )
      })}
    </>
  )
}
