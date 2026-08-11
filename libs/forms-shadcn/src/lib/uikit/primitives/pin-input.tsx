'use client'

import type { UIKitPinInputProps } from '@letar/forms-core/uikit'
import { useRef } from 'react'
import { cn } from '@letar/tailwind-utils'

export function PinInput({ value, onChange, onComplete, length, mask, disabled, ...rest }: UIKitPinInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const chars = value.padEnd(length, ' ').slice(0, length).split('')

  const setChar = (index: number, char: string) => {
    const next = chars.slice()
    next[index] = char || ' '
    const nextValue = next.join('').trimEnd()
    onChange(nextValue)
    if (nextValue.length === length) { onComplete?.(nextValue) }
  }

  return (
    <div data-slot="pin-input" className="flex gap-2" data-field-name={rest['data-field-name']}>
      {chars.map((char, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el
          }}
          type={mask ? 'password' : 'text'}
          inputMode="numeric"
          maxLength={1}
          value={char.trim()}
          disabled={disabled}
          onChange={(e) => {
            const nextChar = e.target.value.slice(-1)
            setChar(index, nextChar)
            if (nextChar && index < length - 1) { inputRefs.current[index + 1]?.focus() }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !chars[index]?.trim() && index > 0) {
              inputRefs.current[index - 1]?.focus()
            }
          }}
          className={cn(
            'border-input size-9 rounded-md border bg-transparent text-center text-sm shadow-xs outline-none',
            'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        />
      ))}
    </div>
  )
}
