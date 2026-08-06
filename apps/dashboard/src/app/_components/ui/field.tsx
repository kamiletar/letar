import { Field as ChakraField } from '@chakra-ui/react'
import * as React from 'react'

export interface FieldProps extends ChakraField.RootProps {
  label?: React.ReactNode
  helperText?: React.ReactNode
  errorText?: React.ReactNode
  optionalText?: React.ReactNode
}

export const Field = React.forwardRef<HTMLDivElement, FieldProps>(function Field(props, ref) {
  const { label, children, helperText, errorText, optionalText, ...rest } = props
  return (
    <ChakraField.Root ref={ref} {...rest}>
      {label && (
        <ChakraField.Label>
          {label}
          {optionalText && <span>{optionalText}</span>}
        </ChakraField.Label>
      )}
      {children}
      {helperText && <ChakraField.HelperText>{helperText}</ChakraField.HelperText>}
      {errorText && (
        <ChakraField.ErrorText>
          {Array.isArray(errorText)
            ? errorText.join(', ')
            : typeof errorText === 'string'
            ? errorText
            : typeof errorText === 'object'
            ? JSON.stringify(errorText)
            : String(errorText)}
        </ChakraField.ErrorText>
      )}
    </ChakraField.Root>
  )
})
