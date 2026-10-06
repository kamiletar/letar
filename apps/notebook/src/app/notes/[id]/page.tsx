import { NoteEditor } from '@/app/_components/note-editor'
import { getEnhancedPrisma } from '@/lib/db'
import { requireOwner } from '@/lib/owner'
import { Container } from '@chakra-ui/react'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireOwner()
  const { id } = await params
  const db = getEnhancedPrisma({ id: user.id })

  const note = await db.note.findFirst({ where: { id, ownerId: user.id, deletedAt: null } })
  if (!note) {
    notFound()
  }
  const version = note.currentVersionId
    ? await db.noteVersion.findUnique({ where: { id: note.currentVersionId } })
    : null

  return (
    <Container maxW="3xl" py={8}>
      <NoteEditor
        noteId={note.id}
        versionId={version?.id ?? null}
        initialTitle={version?.title ?? ''}
        initialBody={version?.body ?? ''}
      />
    </Container>
  )
}
