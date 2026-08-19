'use client'

import { Badge, Box, Card, Grid, Heading, HStack, Link, Separator, Stack, Text } from '@chakra-ui/react'
import NextLink from 'next/link'
import { LuGithub } from 'react-icons/lu'

const appPages = [
  {
    href: '/products',
    title: 'Products CRUD',
    desc: 'Create, read, update, delete — full cycle with PostgreSQL',
    badge: 'Full-Stack',
  },
  { href: '/contacts/new', title: 'Contact Form', desc: 'Form → Server Action → Database', badge: 'Server Action' },
]

const examples = [
  { href: '/examples/basic', title: 'Basic Form', desc: 'String, Select, Checkbox' },
  { href: '/examples/all-fields', title: 'All Fields', desc: '20+ field types showcase' },
  { href: '/examples/advanced-fields', title: 'Advanced Fields', desc: 'Rating, Tags, FileUpload' },
  { href: '/examples/validation', title: 'Validation', desc: 'Zod + Form.Errors' },
  { href: '/examples/constraints', title: 'Constraints', desc: 'Regex, cross-field' },
  { href: '/examples/conditional', title: 'Conditional', desc: 'Form.When' },
  { href: '/examples/multi-step', title: 'Multi-Step', desc: 'Form.Steps wizard' },
  { href: '/examples/groups', title: 'Groups & Arrays', desc: 'Nested + dynamic' },
  { href: '/examples/auto-fields', title: 'Auto Fields', desc: 'Form.FromSchema' },
  { href: '/examples/auto-fields-advanced', title: 'Auto Advanced', desc: 'Include/exclude' },
  { href: '/examples/zenstack', title: 'ZenStack', desc: 'Generated schemas' },
  { href: '/examples/recipes', title: 'Recipes', desc: 'Login, register, etc.' },
  { href: '/examples/theming', title: 'Theming', desc: 'Custom Chakra theme' },
  { href: '/examples/persistence', title: 'Persistence', desc: 'localStorage draft' },
  { href: '/examples/i18n', title: 'i18n', desc: 'Multi-language' },
  { href: '/examples/offline', title: 'Offline', desc: 'Offline-first forms' },
]

export default function HomePage() {
  return (
    <Box>
      <HStack justify="space-between" align="start" mb={2}>
        <Heading size="xl">@letar/forms Example App</Heading>
        <Link
          href="https://github.com/kamiletar/letar/tree/main/apps/form-example"
          target="_blank"
          rel="noopener noreferrer"
          color="fg.muted"
          _hover={{ color: 'fg' }}
          fontSize="sm"
          flexShrink={0}
        >
          <HStack gap={1.5}>
            <LuGithub />
            <Text>GitHub</Text>
          </HStack>
        </Link>
      </HStack>
      <Text color="fg.muted" mb={8}>
        Full-stack application demonstrating forms with PostgreSQL, Server Actions, and TanStack Query.
      </Text>

      <Heading size="md" mb={4}>
        Full-Stack
      </Heading>
      <Grid templateColumns="repeat(auto-fill, minmax(280px, 1fr))" gap={4} mb={8}>
        {appPages.map((p) => (
          <Link key={p.href} asChild _hover={{ textDecoration: 'none' }}>
            <NextLink href={p.href}>
              <Card.Root
                variant="outline"
                borderColor="brand.200"
                _hover={{ borderColor: 'brand.solid', shadow: 'md' }}
                transitionProperty="border-color, box-shadow"
                transitionDuration="0.2s"
              >
                <Card.Body gap={2}>
                  <Stack direction="row" align="center" gap={2}>
                    <Card.Title fontSize="md">{p.title}</Card.Title>
                    <Badge colorPalette="green" size="sm">
                      {p.badge}
                    </Badge>
                  </Stack>
                  <Card.Description fontSize="sm">{p.desc}</Card.Description>
                </Card.Body>
              </Card.Root>
            </NextLink>
          </Link>
        ))}
      </Grid>

      <Separator mb={6} />

      <Heading size="md" mb={4}>
        Component Examples
      </Heading>
      <Grid templateColumns="repeat(auto-fill, minmax(200px, 1fr))" gap={3}>
        {examples.map((ex) => (
          <Link key={ex.href} asChild _hover={{ textDecoration: 'none' }}>
            <NextLink href={ex.href}>
              <Card.Root
                variant="outline"
                _hover={{ borderColor: 'brand.solid', shadow: 'sm' }}
                transitionProperty="border-color, box-shadow"
                transitionDuration="0.2s"
              >
                <Card.Body gap={1} py={3}>
                  <Card.Title fontSize="sm">{ex.title}</Card.Title>
                  <Card.Description fontSize="xs">{ex.desc}</Card.Description>
                </Card.Body>
              </Card.Root>
            </NextLink>
          </Link>
        ))}
      </Grid>
    </Box>
  )
}
