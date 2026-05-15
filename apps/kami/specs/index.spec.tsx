import { render } from '@testing-library/react'
import Page from '../src/app/page'

describe('Page', () => {
  it('should render hello world', () => {
    const { getByText } = render(<Page />)
    expect(getByText('Hello World!')).toBeTruthy()
  })
})
