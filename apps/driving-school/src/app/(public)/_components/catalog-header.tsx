'use client'

import { ColorModeButton } from '@/app/_components/ui/color-mode'
import { Box, Button, Container, HStack, SegmentGroup } from '@chakra-ui/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LuGraduationCap, LuHouse, LuSchool } from 'react-icons/lu'

const CATALOG_SECTIONS = [
  { value: '/schools', label: 'Автошколы', icon: LuSchool },
  { value: '/instructors', label: 'Инструкторы', icon: LuGraduationCap },
]

export function CatalogHeader() {
  const pathname = usePathname()

  // Определяем текущий раздел
  const currentSection = CATALOG_SECTIONS.find((s) => pathname.startsWith(s.value))?.value || '/schools'

  return (
    <Box bg="bg.panel" borderBottomWidth="1px" position="sticky" top={0} zIndex={10}>
      <Container maxW="container.xl">
        <HStack h="60px" justify="space-between">
          {/* Левая часть: кнопка на главную */}
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <LuHouse />
              На главную
            </Link>
          </Button>

          {/* Центр: переключатель разделов */}
          <SegmentGroup.Root value={currentSection} size="sm">
            {CATALOG_SECTIONS.map((section) => (
              <SegmentGroup.Item key={section.value} value={section.value} asChild>
                <Link href={section.value}>
                  <SegmentGroup.ItemText>
                    <HStack gap={1}>
                      <section.icon size={16} />
                      <span>{section.label}</span>
                    </HStack>
                  </SegmentGroup.ItemText>
                  <SegmentGroup.ItemHiddenInput />
                </Link>
              </SegmentGroup.Item>
            ))}
            <SegmentGroup.Indicator />
          </SegmentGroup.Root>

          {/* Правая часть: переключатель темы */}
          <ColorModeButton />
        </HStack>
      </Container>
    </Box>
  )
}
