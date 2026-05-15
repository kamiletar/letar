import { requireAdmin } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Container, Heading, HStack, Link, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { notFound } from 'next/navigation'
import { ColorForm } from '../../_components/color-form'
import { DeleteColorButton } from './_components/delete-color-button'

interface EditColorPageProps {
  params: Promise<{ id: string }>
}

export default async function EditColorPage({ params }: EditColorPageProps) {
  const user = await requireAdmin()
  const db = getEnhancedPrisma(user)
  const { id } = await params

  const color = (await db.color.findUnique({
    where: { id },
    include: {
      _count: {
        select: { variants: true },
      },
    },
  })) as unknown as { id: string; name: string; slug: string; hex: string; _count: { variants: number } } | null

  if (!color) {
    notFound()
  }

  const usageCount = color._count.variants

  return (
    <Container maxW="2xl" py={8}>
      <VStack gap={6} align="stretch">
        <Box>
          <Link asChild color="fg.muted" fontSize="sm" mb={2}>
            <NextLink href="/admin/colors">← Вернуться к списку цветов</NextLink>
          </Link>
          <HStack justify="space-between" align="start">
            <Box>
              <Heading size="xl" textTransform="none">
                Редактирование цвета
              </Heading>
              {usageCount > 0 && (
                <Text fontSize="sm" color="fg.muted" mt={1}>
                  Используется в {usageCount} вариантах товаров
                </Text>
              )}
            </Box>
            <DeleteColorButton colorId={id} colorName={color.name} usageCount={usageCount} />
          </HStack>
        </Box>

        <ColorForm
          mode="edit"
          colorId={id}
          defaultValues={{
            name: color.name,
            slug: color.slug,
            hex: color.hex,
          }}
        />
      </VStack>
    </Container>
  )
}
