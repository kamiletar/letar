'use client'

import { NavLink } from '@/app/_components/nav-link'
import { Box, Grid, Menu, Portal, Text } from '@chakra-ui/react'
import { LuChevronDown, LuGrid3X3, LuSparkles } from 'react-icons/lu'
import { MdFemale } from 'react-icons/md'

interface Category {
  id: string
  name: string
  slug: string
}

interface CatalogMenuProps {
  /** Категории для отображения в меню */
  categories: Category[]
}

/**
 * Mega Menu для навигации по каталогу.
 * Показывает dropdown с категориями при наведении/клике.
 */
export function CatalogMenu({ categories }: CatalogMenuProps) {
  return (
    <Menu.Root
      positioning={{
        placement: 'bottom',
        gutter: 8,
      }}
    >
      <Menu.Trigger asChild>
        <Box
          as="button"
          display="flex"
          alignItems="center"
          gap={1}
          color="fg.muted"
          _hover={{ color: 'fg' }}
          px={4}
          py={2}
          fontSize="sm"
          textTransform="uppercase"
          letterSpacing="wider"
          cursor="pointer"
          data-testid="catalog-menu-trigger"
        >
          Каталог
          <LuChevronDown size={14} />
        </Box>
      </Menu.Trigger>

      <Portal>
        <Menu.Positioner>
          <Menu.Content minW="400px" p={4} data-testid="catalog-menu-content">
            {/* Быстрые фильтры */}
            <Box mb={4}>
              <Text fontSize="xs" fontWeight="semibold" color="fg.muted" mb={2} textTransform="uppercase">
                Быстрый доступ
              </Text>
              <Grid templateColumns="repeat(3, 1fr)" gap={2}>
                <Menu.Item value="all" asChild>
                  <NavLink href="/catalog" display="flex" alignItems="center" gap={2}>
                    <LuGrid3X3 size={16} />
                    Все товары
                  </NavLink>
                </Menu.Item>
                <Menu.Item value="new" asChild>
                  <NavLink href="/catalog?new=true" display="flex" alignItems="center" gap={2}>
                    <LuSparkles size={16} />
                    Новинки
                  </NavLink>
                </Menu.Item>
                <Menu.Item value="female" asChild>
                  <NavLink href="/catalog?gender=FEMALE" display="flex" alignItems="center" gap={2}>
                    <MdFemale size={16} />
                    Женское
                  </NavLink>
                </Menu.Item>
              </Grid>
            </Box>

            <Menu.Separator />

            {/* Категории */}
            {categories.length > 0 && (
              <Box mt={4}>
                <Text fontSize="xs" fontWeight="semibold" color="fg.muted" mb={2} textTransform="uppercase">
                  Категории
                </Text>
                <Grid templateColumns="repeat(2, 1fr)" gap={1}>
                  {categories.map((category) => (
                    <Menu.Item key={category.id} value={category.slug} asChild>
                      <NavLink href={`/catalog?category=${category.slug}`}>{category.name}</NavLink>
                    </Menu.Item>
                  ))}
                </Grid>
              </Box>
            )}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}
