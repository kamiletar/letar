/**
 * Ambient declarations для Яндекс.Карт 3.0 (ymaps3).
 * Покрывает только используемые в проекте API.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Ymaps3Location {
  center: [number, number]
  zoom: number
}

interface Ymaps3MapOptions {
  location: Ymaps3Location
}

interface Ymaps3Map {
  addChild(layer: any): Ymaps3Map
  destroy(): void
}

interface Ymaps3MarkerOptions {
  coordinates: [number, number]
  element: HTMLElement
}

interface Ymaps3Api {
  ready: Promise<void>
  YMap: new (container: HTMLElement, options: Ymaps3MapOptions) => Ymaps3Map
  YMapDefaultSchemeLayer: new (options?: Record<string, unknown>) => any
  YMapDefaultFeaturesLayer: new (options?: Record<string, unknown>) => any
  YMapMarker: new (options: { coordinates: [number, number] }, element?: HTMLElement) => any
}

declare global {
  interface Window {
    ymaps3?: Ymaps3Api
  }
}

export {}
