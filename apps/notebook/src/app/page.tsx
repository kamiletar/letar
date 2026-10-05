import { getEnhancedPrisma } from '@/lib/db'
import { requireOwner } from '@/lib/owner'
import { ensureDefaultRubrics } from '@/lib/rubrics'
import { Container, Heading, Stack, Tag, Text } from '@chakra-ui/react'

export default async function HomePage() {
  const user = await requireOwner()
  await ensureDefaultRubrics(user.id)

  const db = getEnhancedPrisma({ id: user.id })
  const [rubrics, notesCount] = await Promise.all([
    db.rubric.findMany({ where: { ownerId: user.id }, orderBy: { sort: 'asc' } }),
    db.note.count({ where: { ownerId: user.id, deletedAt: null } }),
  ])

  return (
    <Container maxW="3xl" py={16}>
      <Stack gap={6}>
        <Heading asChild size="2xl">
          <h1>Блокнот Ками</h1>
        </Heading>
        <Text color="fg.muted">Заметок: {notesCount}</Text>
        <Stack direction="row" wrap="wrap" gap={2}>
          {rubrics.map((rubric) => (
            <Tag.Root key={rubric.id} size="lg" colorPalette="teal">
              <Tag.Label>{rubric.name}</Tag.Label>
            </Tag.Root>
          ))}
        </Stack>
      </Stack>
    </Container>
  )
}
