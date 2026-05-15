import { render } from '@testing-library/react'

import YandexMetrika from './yandex-metrika'

describe('YandexMetrika', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<YandexMetrika />)
    expect(baseElement).toBeTruthy()
  })
})
