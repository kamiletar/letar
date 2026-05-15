import { requireAdmin } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Button, ColorSwatch, Container, Heading, HStack, Link, Table, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { SeedColorsButton } from './_components/seed-colors-button'

export default async function AdminColorsPage() {
  const user = await requireAdmin()
  const db = getEnhancedPrisma(user)

  // Получаем все цвета с количеством использований
  const colors = (await db.color.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { variants: true },
      },
    },
  })) as unknown as Array<{ id: string; name: string; slug: string; hex: string; _count: { variants: number } }>

  return (
    <Container maxW="6xl" py={8}>
      <VStack gap={8} align="stretch">
        <Box>
          <Link asChild color="fg.muted" fontSize="sm" mb={2}>
            <NextLink href="/admin">← Вернуться к панели администратора</NextLink>
          </Link>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Heading size="2xl" textTransform="none">
              Цвета
            </Heading>
            <HStack gap={2}>
              <SeedColorsButton />
              <Button asChild colorPalette="fg">
                <NextLink href="/admin/colors/new">Создать</NextLink>
              </Button>
            </HStack>
          </Box>
          <Text color="fg.muted">Управление справочником цветов для фильтрации в каталоге</Text>
        </Box>

        {colors.length > 0 ? (
          <Table.Root variant="outline">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Цвет</Table.ColumnHeader>
                <Table.ColumnHeader>Название</Table.ColumnHeader>
                <Table.ColumnHeader>Slug</Table.ColumnHeader>
                <Table.ColumnHeader>HEX</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="right">Вариантов</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="right">Действия</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {colors.map((color) => (
                <Table.Row key={color.id}>
                  <Table.Cell>
                    <ColorSwatch value={color.hex} size="lg" borderRadius="full" />
                  </Table.Cell>
                  <Table.Cell fontWeight="medium">{color.name}</Table.Cell>
                  <Table.Cell>
                    <Text fontFamily="mono" fontSize="sm">
                      {color.slug}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontFamily="mono" fontSize="sm">
                      {color.hex}
                    </Text>
                  </Table.Cell>
                  <Table.Cell textAlign="right">{color._count.variants}</Table.Cell>
                  <Table.Cell textAlign="right">
                    <Button asChild size="sm" variant="outline">
                      <NextLink href={`/admin/colors/${color.id}/edit`}>Редактировать</NextLink>
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        ) : (
          <Box textAlign="center" py={12} bg="bg.muted" borderRadius="lg">
            <Text color="fg.muted" mb={4}>
              Цвета ещё не созданы
            </Text>
            <HStack gap={2} justify="center">
              <SeedColorsButton />
              <Button asChild colorPalette="fg">
                <NextLink href="/admin/colors/new">Создать первый цвет</NextLink>
              </Button>
            </HStack>
          </Box>
        )}
      </VStack>
    </Container>
  )
}
