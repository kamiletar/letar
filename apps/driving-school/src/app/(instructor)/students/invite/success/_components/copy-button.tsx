'use client'

import { Button } from '@chakra-ui/react'
import { useState } from 'react'
import { LuCheck, LuCopy } from 'react-icons/lu'

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button onClick={handleCopy} colorPalette={copied ? 'green' : 'fg'}>
      {copied ? <LuCheck /> : <LuCopy />}
      {copied ? 'Скопировано' : 'Копировать'}
    </Button>
  )
}
