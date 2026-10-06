import { getEnhancedPrisma } from '@/lib/db'
import { DATE_FORMAT } from '@/lib/format'
import { requireOwner } from '@/lib/owner'
import { ensureDefaultRubrics } from '@/lib/rubrics'
import { displayTitle } from '@/lib/versions'
import { Button, Container, Heading, HStack, Stack, Tag, Text } from '@chakra-ui/react'
import NextLink from 'next/link'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const user = await requireOwner()
  await ensureDefaultRubrics(user.id)

  const db = getEnhancedPrisma({ id: user.id })
  const [rubrics, notes] = await Promise.all([
    db.rubric.findMany({ where: { ownerId: user.id }, orderBy: { sort: 'asc' } }),
    db.note.findMany({ where: { ownerId: user.id, deletedAt: null }, orderBy: { updatedAt: 'desc' } }),
  ])
  const versions = await db.noteVersion.findMany({
    where: { id: { in: notes.flatMap((n) => (n.currentVersionId ? [n.currentVersionId] : [])) } },
    select: { id: true, title: true, body: true },
  })
  const versionById = new Map(versions.map((v) => [v.id, v]))

  return (
    <Container maxW="3xl" py={12}>
      <Stack gap={6}>
        <HStack justify="space-between" wrap="wrap">
          <Heading asChild size="2xl">
            <h1>Блокнот Ками</h1>
          </Heading>
          <Button asChild colorPalette="teal">
            <NextLink href="/notes/new">Новая заметка</NextLink>
          </Button>
        </HStack>

        <Stack direction="row" wrap="wrap" gap={2}>
          {rubrics.map((rubric) => (
            <Tag.Root key={rubric.id} size="lg" colorPalette="teal">
              <Tag.Label>{rubric.name}</Tag.Label>
            </Tag.Root>
          ))}
        </Stack>

        <Text color="fg.muted">Заметок: {notes.length}</Text>

        <Stack gap={2}>
          {notes.map((note) => {
            const version = note.currentVersionId ? versionById.get(note.currentVersionId) : undefined
            return (
              <Button
                key={note.id}
                asChild
                variant="outline"
                h="auto"
                py={3}
                justifyContent="space-between"
                textAlign="start"
              >
                <NextLink href={`/notes/${note.id}`}>
                  <Text fontWeight="medium" truncate>{version ? displayTitle(version) : 'Без названия'}</Text>
                  <Text color="fg.muted" fontSize="sm" flexShrink={0}>{DATE_FORMAT.format(note.updatedAt)}</Text>
                </NextLink>
              </Button>
            )
          })}
        </Stack>
      </Stack>
    </Container>
  )
}
