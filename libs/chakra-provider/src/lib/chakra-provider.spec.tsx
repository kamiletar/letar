import { render } from '@testing-library/react'

import LenaChakraProvider from './chakra-provider'

describe('LenaChakraProvider', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<LenaChakraProvider />)
    expect(baseElement).toBeTruthy()
  })
})
