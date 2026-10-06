import { DiffView } from '@/app/_components/diff-view'
import { MergePanel } from '@/app/_components/merge-panel'
import { RevertButton } from '@/app/_components/revert-button'
import { findHeads } from '@/lib/branches'
import { getEnhancedPrisma } from '@/lib/db'
import { DATE_FORMAT } from '@/lib/format'
import { requireOwner } from '@/lib/owner'
import { diffLines, displayTitle } from '@/lib/versions'
import { Badge, Button, Container, Heading, HStack, Stack, Text } from '@chakra-ui/react'
import NextLink from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface HistoryPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string; to?: string }>
}

function pick(v: { id: string; title: string; body: string; createdAt: Date }) {
  return { id: v.id, title: v.title, body: v.body, createdAt: DATE_FORMAT.format(v.createdAt) }
}

export default async function HistoryPage({ params, searchParams }: HistoryPageProps) {
  const user = await requireOwner()
  const { id } = await params
  const { from, to } = await searchParams
  const db = getEnhancedPrisma({ id: user.id })

  const note = await db.note.findFirst({ where: { id, ownerId: user.id, deletedAt: null } })
  if (!note) {
    notFound()
  }
  const versions = await db.noteVersion.findMany({ where: { noteId: note.id }, orderBy: { createdAt: 'desc' } })

  const heads = findHeads(versions)
  const mainHead = heads.find((v) => v.id === note.currentVersionId) ?? heads[0]
  const otherHeads = heads.filter((v) => v.id !== mainHead?.id)

  const current = versions.find((v) => v.id === note.currentVersionId) ?? versions[0]
  // По умолчанию показываем, что изменилось в последней версии
  const newer = versions.find((v) => v.id === to) ?? current
  const older = versions.find((v) => v.id === from) ?? versions.find((v) => v.id === newer?.parentId)
  const diff = newer ? diffLines(older?.body ?? '', newer.body) : []
  const titleChanged = older && newer && older.title !== newer.title

  return (
    <Container maxW="3xl" py={8}>
      <Stack gap={6}>
        <HStack justify="space-between" wrap="wrap">
          <Button asChild variant="ghost" size="sm">
            <NextLink href={`/notes/${note.id}`}>← К заметке</NextLink>
          </Button>
          {older && <RevertButton noteId={note.id} versionId={older.id} />}
        </HStack>

        <Heading asChild size="xl">
          <h1>История: {current ? displayTitle(current) : 'Без названия'}</h1>
        </Heading>

        {mainHead && otherHeads.length > 0 && (
          <Stack gap={3}>
            <Heading asChild size="md">
              <h2>Ветки ждут слияния ({otherHeads.length})</h2>
            </Heading>
            {/* Сливаем по одной: после слияния страница обновится и покажет следующую */}
            <MergePanel
              noteId={note.id}
              main={{ ...pick(mainHead) }}
              other={{ ...pick(otherHeads[0]) }}
            />
          </Stack>
        )}

        <Stack gap={2}>
          <Text color="fg.muted" fontSize="sm">
            {older
              ? `Сравнение: ${DATE_FORMAT.format(older.createdAt)} → ${DATE_FORMAT.format(newer.createdAt)}`
              : 'Первая версия'}
          </Text>
          {titleChanged && <Text fontSize="sm">Заголовок: «{older.title}» → «{newer.title}»</Text>}
          <DiffView lines={diff} empty="Текст пуст" />
        </Stack>

        <Stack gap={2}>
          <Heading asChild size="md">
            <h2>Версии ({versions.length})</h2>
          </Heading>
          {versions.map((version) => (
            <HStack key={version.id} justify="space-between" wrap="wrap" borderWidth="1px" borderRadius="md" p={3}>
              <Stack gap={0}>
                <HStack>
                  <Text fontWeight="medium">{DATE_FORMAT.format(version.createdAt)}</Text>
                  {version.id === current?.id && <Badge colorPalette="teal">текущая</Badge>}
                </HStack>
                <Text color="fg.muted" fontSize="sm">{displayTitle(version)}</Text>
              </Stack>
              <HStack gap={1}>
                <Button asChild size="xs" variant={version.id === older?.id ? 'solid' : 'outline'}>
                  <NextLink href={`?from=${version.id}${newer ? `&to=${newer.id}` : ''}`}>Было</NextLink>
                </Button>
                <Button asChild size="xs" variant={version.id === newer?.id ? 'solid' : 'outline'}>
                  <NextLink href={`?to=${version.id}${older ? `&from=${older.id}` : ''}`}>Стало</NextLink>
                </Button>
              </HStack>
            </HStack>
          ))}
        </Stack>
      </Stack>
    </Container>
  )
}
