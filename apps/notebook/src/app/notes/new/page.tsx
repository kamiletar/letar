import { NoteEditor } from '@/app/_components/note-editor'
import { requireOwner } from '@/lib/owner'
import { Container } from '@chakra-ui/react'

export default async function NewNotePage() {
  await requireOwner()
  return (
    <Container maxW="3xl" py={8}>
      <NoteEditor noteId={null} versionId={null} initialTitle="" initialBody="" />
    </Container>
  )
}
