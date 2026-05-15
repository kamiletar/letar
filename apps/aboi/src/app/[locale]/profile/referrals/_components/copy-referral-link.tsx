'use client'

import { Button, HStack, Input } from '@chakra-ui/react'
import { useState } from 'react'

export function CopyReferralLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // ignore
    }
  }

  return (
    <HStack gap={2}>
      <Input value={link} readOnly fontFamily="mono" fontSize="sm" />
      <Button colorPalette="brand" onClick={copy}>
        {copied ? 'Скопировано ✓' : 'Скопировать'}
      </Button>
    </HStack>
  )
}
