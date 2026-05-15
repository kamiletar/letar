export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { Badge, Button, Card, Heading, HStack, Stack, Text } from '@chakra-ui/react'
import NextLink from 'next/link'

export default async function ContactsPage() {
  const contacts = await db.contact.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return (
    <Stack gap={6}>
      <HStack justify="space-between">
        <div>
          <Heading size="lg">Contact Messages</Heading>
          <Text color="fg.muted">Form submissions saved to database</Text>
        </div>
        <Button asChild colorPalette="brand">
          <NextLink href="/contacts/new">+ New Message</NextLink>
        </Button>
      </HStack>

      {contacts.length === 0 ? (
        <Card.Root>
          <Card.Body>
            <Text color="fg.muted" textAlign="center" py={8}>
              No messages yet. Send your first contact form!
            </Text>
          </Card.Body>
        </Card.Root>
      ) : (
        <Stack gap={3}>
          {contacts.map(
            (contact: {
              id: string
              name: string
              email: string
              subject: string
              message: string
              createdAt: Date
            }) => (
              <Card.Root key={contact.id} variant="outline">
                <Card.Body>
                  <HStack justify="space-between" align="start">
                    <Stack gap={1}>
                      <HStack>
                        <Text fontWeight="medium">{contact.name}</Text>
                        <Badge>{contact.subject}</Badge>
                      </HStack>
                      <Text fontSize="sm" color="fg.muted">
                        {contact.email}
                      </Text>
                      <Text fontSize="sm">{contact.message}</Text>
                    </Stack>
                    <Text fontSize="xs" color="fg.muted">
                      {new Date(contact.createdAt).toLocaleDateString()}
                    </Text>
                  </HStack>
                </Card.Body>
              </Card.Root>
            )
          )}
        </Stack>
      )}
    </Stack>
  )
}
