'use client'

import { Box, Heading, HStack, Link, Separator, Stack, Text } from '@chakra-ui/react'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import { LuGithub } from 'react-icons/lu'

const appPages = [
  { href: '/products', label: 'Products', description: 'CRUD with database' },
  { href: '/contacts', label: 'Contacts', description: 'Form → Server Action' },
]

const examples = [
  { href: '/examples/basic', label: 'Basic Form' },
  { href: '/examples/all-fields', label: 'All Fields (39)' },
  { href: '/examples/advanced-fields', label: 'Advanced Fields' },
  { href: '/examples/validation', label: 'Validation' },
  { href: '/examples/constraints', label: 'Constraints' },
  { href: '/examples/conditional', label: 'Conditional' },
  { href: '/examples/watch', label: 'Watch & onChange' },
  { href: '/examples/multi-step', label: 'Multi-Step' },
  { href: '/examples/groups', label: 'Groups & Arrays' },
  { href: '/examples/auto-fields', label: 'Auto Fields' },
  { href: '/examples/auto-fields-advanced', label: 'Auto Advanced' },
  { href: '/examples/zenstack', label: 'ZenStack' },
  { href: '/examples/recipes', label: 'Recipes' },
  { href: '/examples/theming', label: 'Theming' },
  { href: '/examples/persistence', label: 'Persistence' },
  { href: '/examples/i18n', label: 'i18n' },
  { href: '/examples/offline', label: 'Offline' },
  { href: '/examples/autofill', label: 'Smart Autofill' },
  { href: '/examples/calculated', label: 'Calculated Fields' },
  { href: '/examples/utility', label: 'Utility Components' },
  { href: '/examples/security', label: 'Security' },
  { href: '/examples/signature', label: 'Signature' },
  { href: '/examples/documents', label: 'Russian Documents' },
  { href: '/examples/table-editor', label: 'Table Editor' },
  { href: '/examples/matrix-choice', label: 'Matrix Choice' },
  { href: '/examples/survey-fields', label: 'Survey Fields' },
  { href: '/examples/async-validation', label: 'Async Validation' },
  { href: '/examples/templates', label: 'Form Templates' },
  { href: '/examples/autosave', label: 'Autosave' },
  { href: '/examples/conversational', label: 'Conversational' },
  { href: '/examples/data-grid', label: 'Data Grid' },
  { href: '/examples/credit-card', label: 'Credit Card' },
  { href: '/examples/captcha', label: 'CAPTCHA' },
  { href: '/examples/analytics', label: 'Analytics' },
  { href: '/examples/server-errors', label: 'Server Errors' },
  { href: '/examples/readonly', label: 'ReadOnly View' },
  { href: '/examples/skeleton', label: 'Skeleton Loading' },
  { href: '/examples/undo-redo', label: 'Undo/Redo' },
  { href: '/examples/comparison', label: 'Comparison Diff' },
  { href: '/examples/depends-on', label: 'DependsOn' },
  { href: '/examples/debug-values', label: 'Debug Values' },
  { href: '/examples/testing-utilities', label: 'Testing Utilities' },
  { href: '/examples/url-prefill', label: 'URL Prefill' },
]

function NavLink({ href, label, description }: { href: string; label: string; description?: string }) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      asChild
      display="block"
      px={3}
      py={description ? 2 : 1.5}
      borderRadius="md"
      bg={isActive ? 'brand.muted' : 'transparent'}
      color={isActive ? 'brand.fg' : undefined}
      _hover={{ bg: 'brand.subtle' }}
    >
      <NextLink href={href}>
        <Text fontWeight="medium" fontSize="sm">
          {label}
        </Text>
        {description && (
          <Text fontSize="xs" color="fg.muted">
            {description}
          </Text>
        )}
      </NextLink>
    </Link>
  )
}

export function Nav() {
  return (
    <Box
      as="nav"
      w="240px"
      minH="100vh"
      borderRightWidth="1px"
      p={4}
      position="fixed"
      top={0}
      left={0}
      overflowY="auto"
    >
      <Heading size="md" mb={4}>
        <Link asChild color="inherit" _hover={{ textDecoration: 'none' }}>
          <NextLink href="/">@letar/forms</NextLink>
        </Link>
      </Heading>

      <Text fontSize="xs" fontWeight="bold" color="fg.muted" mb={2} px={3}>
        APP
      </Text>
      <Stack gap={1} mb={4}>
        {appPages.map((p) => <NavLink key={p.href} {...p} />)}
      </Stack>

      <Separator mb={4} />

      <Text fontSize="xs" fontWeight="bold" color="fg.muted" mb={2} px={3}>
        EXAMPLES
      </Text>
      <Stack gap={0.5}>
        {examples.map((ex) => <NavLink key={ex.href} {...ex} />)}
      </Stack>

      <Separator my={4} />

      <Link
        href="https://github.com/kamiletar/letar/tree/main/apps/form-example"
        target="_blank"
        rel="noopener noreferrer"
        display="block"
        px={3}
        py={1.5}
        borderRadius="md"
        color="fg.muted"
        _hover={{ bg: 'brand.subtle', color: 'fg' }}
      >
        <HStack gap={1.5}>
          <LuGithub />
          <Text fontWeight="medium" fontSize="sm">
            GitHub
          </Text>
        </HStack>
      </Link>
    </Box>
  )
}
