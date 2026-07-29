'use client'

import { createBandsReader } from '@/lib/audio/analyser'
import { useEffect, useRef } from 'react'

interface SpinGraphCanvasProps {
  analyser: AnalyserNode | null
  /** Число одновременно звучащих нот — раскрывает граф, добавляет узлам «жизни» без звука */
  activeNoteCount: number
}

const GOLD_BRIGHT = '#F5D85A'
const VOID_BG = '#040302'

/**
 * Реактивный спин-граф — визуальное ядро VJ-режима.
 *
 * Мотив: Звезда Давида из двух невозможных треугольников Пенроуза (лого studio), вращающихся
 * в противоположные стороны — центральное «ядро» графа. Вокруг — 6 внешних узлов (эхо 6
 * FM-операторов), рёбра между ними «дышат» вместе со звуком: бас скручивает/раздувает ядро,
 * середина держит яркость рёбер, верха дают «искры»-частицы вдоль рёбер. Глубина/пространство
 * важнее цвета (владелец не видит цвет в звуке, но остро слышит объём) — весь визуал
 * монохромный золото/пустота, разница в яркости и радиальном размытии, не в оттенках.
 */
export function SpinGraphCanvas({ analyser, activeNoteCount }: SpinGraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const activeNoteCountRef = useRef(activeNoteCount)
  activeNoteCountRef.current = activeNoteCount

  useEffect(() => {
    const maybeCanvas = canvasRef.current
    if (!maybeCanvas) {
      return
    }
    const maybeCtx = maybeCanvas.getContext('2d')
    if (!maybeCtx) {
      return
    }
    // Явный не-nullable тип нужен, т.к. TS не удерживает narrowing внутри вложенных function-деклараций
    const canvas: HTMLCanvasElement = maybeCanvas
    const ctx2d: CanvasRenderingContext2D = maybeCtx

    const readBands = analyser ? createBandsReader(analyser) : null

    let coreAngleA = 0
    let coreAngleB = 0
    let outerAngle = 0
    // Плавающая (сглаженная) энергия — сырые FFT-значения дёргаются кадр к кадру, глазу нужна инерция
    let smoothBass = 0
    let smoothMid = 0
    let smoothTreble = 0

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = canvas.clientWidth * dpr
      canvas.height = canvas.clientHeight * dpr
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    // Треугольник Пенроуза (упрощённо для 2D-канвы: не настоящая невозможная фигура,
    // а её силуэт-намёк — три вершины, соединённые через центр смещёнными линиями,
    // создающими на глаз «ломаный» невозможный контур типичный для 2D-иллюзий Пенроуза)
    function drawPenroseTriangle(cx: number, cy: number, radius: number, angle: number, alpha: number) {
      ctx2d.save()
      ctx2d.translate(cx, cy)
      ctx2d.rotate(angle)
      ctx2d.strokeStyle = `rgba(212, 175, 55, ${alpha})`
      ctx2d.lineWidth = 2
      ctx2d.beginPath()
      for (let i = 0; i < 3; i++) {
        const a1 = (i / 3) * Math.PI * 2 - Math.PI / 2
        const a2 = ((i + 1) / 3) * Math.PI * 2 - Math.PI / 2
        const x1 = Math.cos(a1) * radius
        const y1 = Math.sin(a1) * radius
        const x2 = Math.cos(a2) * radius
        const y2 = Math.sin(a2) * radius
        // смещённая внутренняя линия вдоль каждой стороны — даёт «ступенчатый» невозможный вид
        const midX = (x1 + x2) / 2
        const midY = (y1 + y2) / 2
        const innerX = midX * 0.55
        const innerY = midY * 0.55
        ctx2d.moveTo(x1, y1)
        ctx2d.lineTo(innerX, innerY)
        ctx2d.moveTo(innerX, innerY)
        ctx2d.lineTo(x2, y2)
      }
      ctx2d.stroke()
      ctx2d.restore()
    }

    function draw() {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      const cx = w / 2
      const cy = h / 2

      const bands = readBands ? readBands() : { bass: 0, mid: 0, treble: 0, overall: 0 }
      smoothBass += (bands.bass - smoothBass) * 0.15
      smoothMid += (bands.mid - smoothMid) * 0.2
      smoothTreble += (bands.treble - smoothTreble) * 0.3

      // Пустота Малевича — тёмный фон с едва заметным радиальным свечением от ядра
      ctx2d.fillStyle = VOID_BG
      ctx2d.fillRect(0, 0, w, h)
      const glow = ctx2d.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.6)
      glow.addColorStop(0, `rgba(212, 175, 55, ${0.05 + smoothBass * 0.12})`)
      glow.addColorStop(1, 'rgba(4, 3, 2, 0)')
      ctx2d.fillStyle = glow
      ctx2d.fillRect(0, 0, w, h)

      const baseRadius = Math.min(w, h) * 0.22
      const coreRadius = baseRadius * (1 + smoothBass * 0.35)

      coreAngleA += 0.004 + smoothMid * 0.02
      coreAngleB -= 0.004 + smoothMid * 0.02
      drawPenroseTriangle(cx, cy, coreRadius, coreAngleA, 0.5 + smoothBass * 0.5)
      drawPenroseTriangle(cx, cy, coreRadius, coreAngleB + Math.PI, 0.5 + smoothBass * 0.5)

      // 6 внешних узлов — эхо 6 операторов FM-движка; чем больше держится нот, тем шире орбита
      const nodeCount = 6
      const orbitRadius = baseRadius * (2.2 + Math.min(activeNoteCountRef.current, 8) * 0.06)
      outerAngle += 0.0015 + smoothTreble * 0.01

      const positions: Array<{ x: number; y: number }> = []
      for (let i = 0; i < nodeCount; i++) {
        const a = outerAngle + (i / nodeCount) * Math.PI * 2
        positions.push({ x: cx + Math.cos(a) * orbitRadius, y: cy + Math.sin(a) * orbitRadius })
      }

      // Рёбра гексаграммы (каждый узел к узлу через один — рисует две наложенные треугольные звёзды)
      ctx2d.lineWidth = 1
      for (let i = 0; i < nodeCount; i++) {
        const a = positions[i]
        const b = positions[(i + 2) % nodeCount]
        if (!a || !b) {continue}
        const grad = ctx2d.createLinearGradient(a.x, a.y, b.x, b.y)
        grad.addColorStop(0, `rgba(212, 175, 55, ${0.15 + smoothMid * 0.35})`)
        grad.addColorStop(1, `rgba(245, 216, 90, ${0.05 + smoothMid * 0.2})`)
        ctx2d.strokeStyle = grad
        ctx2d.beginPath()
        ctx2d.moveTo(a.x, a.y)
        ctx2d.lineTo(b.x, b.y)
        ctx2d.stroke()

        // «Искра» вдоль ребра на верхах — движется от a к b, положение по фазе времени
        if (smoothTreble > 0.08) {
          const t = (performance.now() / 400) % 1
          const sx = a.x + (b.x - a.x) * t
          const sy = a.y + (b.y - a.y) * t
          ctx2d.fillStyle = `rgba(245, 216, 90, ${Math.min(smoothTreble * 1.5, 0.9)})`
          ctx2d.beginPath()
          ctx2d.arc(sx, sy, 1.5, 0, Math.PI * 2)
          ctx2d.fill()
        }
      }

      // Узлы — пульсируют от общей энергии
      for (const p of positions) {
        const r = 3 + bands.overall * 6
        ctx2d.fillStyle = GOLD_BRIGHT
        ctx2d.beginPath()
        ctx2d.arc(p.x, p.y, r, 0, Math.PI * 2)
        ctx2d.fill()
        ctx2d.strokeStyle = `rgba(212, 175, 55, ${0.3 + smoothBass * 0.4})`
        ctx2d.beginPath()
        ctx2d.arc(p.x, p.y, r + 4, 0, Math.PI * 2)
        ctx2d.stroke()
      }

      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', resize)
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [analyser])

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
}
