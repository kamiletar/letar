import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { AnalyticsGate } from './analytics-gate'
import { createConsentConfig } from './consent-types'

describe('AnalyticsGate', () => {
  afterEach(() => {
    window.localStorage.clear()
  })

  it('не рендерит children без согласия на аналитику', () => {
    render(
      <AnalyticsGate appKey="test-app">
        <div data-testid="analytics-script">script</div>
      </AnalyticsGate>,
    )
    expect(screen.queryByTestId('analytics-script')).not.toBeInTheDocument()
  })

  it('рендерит children, если в localStorage есть согласие на аналитику', () => {
    const { storageKey } = createConsentConfig('test-app', 'v1')
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        necessary: true,
        analytics: true,
        marketing: false,
        version: 'v1',
        acceptedAt: new Date().toISOString(),
      }),
    )

    render(
      <AnalyticsGate appKey="test-app" policyVersion="v1">
        <div data-testid="analytics-script">script</div>
      </AnalyticsGate>,
    )
    expect(screen.getByTestId('analytics-script')).toBeInTheDocument()
  })

  it('не рендерит children, если analytics=false в сохранённом согласии', () => {
    const { storageKey } = createConsentConfig('test-app', 'v1')
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        necessary: true,
        analytics: false,
        marketing: false,
        version: 'v1',
        acceptedAt: new Date().toISOString(),
      }),
    )

    render(
      <AnalyticsGate appKey="test-app" policyVersion="v1">
        <div data-testid="analytics-script">script</div>
      </AnalyticsGate>,
    )
    expect(screen.queryByTestId('analytics-script')).not.toBeInTheDocument()
  })

  it('изолирует согласие по appKey (namespace)', () => {
    const { storageKey } = createConsentConfig('other-app', 'v1')
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        necessary: true,
        analytics: true,
        marketing: false,
        version: 'v1',
        acceptedAt: new Date().toISOString(),
      }),
    )

    render(
      <AnalyticsGate appKey="test-app" policyVersion="v1">
        <div data-testid="analytics-script">script</div>
      </AnalyticsGate>,
    )
    expect(screen.queryByTestId('analytics-script')).not.toBeInTheDocument()
  })
})
