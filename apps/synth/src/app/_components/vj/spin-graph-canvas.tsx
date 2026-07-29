'use client'

import { createBandsReader } from '@/lib/audio/analyser'
import type { SubtractivePatch } from '@/lib/patch/schema'
import { type RefObject, useEffect, useRef } from 'react'

interface SpinGraphCanvasProps {
  analyser: AnalyserNode | null
  /** Число одновременно звучащих нот — раскрывает граф, добавляет узлам «жизни» без звука */
  activeNoteCount: number
  /**
   * Живой SUB-патч студии («один девайс для звука И картинки»): те же ручки/энкодеры,
   * что крутят cutoff/резонанс/пространство звука, одновременно двигают граф. azimuth/depth
   * реально управляют звуковым панорамированием (см. use-master-bus.ts) — не дублирующая
   * MIDI-проводка, а чтение уже живого состояния.
   */
  patchRef?: RefObject<SubtractivePatch>
  /** Счётчик ударов (нота/пэд) — растёт на каждый triggerNote/pad-hit; даёт резкую вспышку-пульс */
  pulseRef?: RefObject<number>
  /**
   * Счётчик четвертных долей активного секвенсора (драм-кит/пиано-ролл) — растёт ровно раз на бит,
   * даже если на этом шаге нет реальной ноты. В отличие от `pulseRef` (локальная вспышка узлов на
   * каждый транзиент), даёт устойчивое расширяющееся кольцо в темп BPM — видимый метроном графа,
   * который держит форму даже в разреженном паттерне или в тишине между нотами.
   */
  beatRef?: RefObject<number>
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
export function SpinGraphCanvas({ analyser, activeNoteCount, patchRef, pulseRef, beatRef }: SpinGraphCanvasProps) {
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
    // Вспышка-пульс на удар ноты/пэда — растёт мгновенно, затухает экспоненциально по кадрам
    let pulseEnergy = 0
    let lastPulseSeen = pulseRef?.current ?? 0
    // Расширяющееся кольцо-метроном на бит — в отличие от pulseEnergy не затухает по яркости,
    // а «бежит» от ядра наружу и исчезает по достижении края; несколько колец могут сосуществовать
    // на быстром темпе, поэтому храним список фаз (0 = только родилось, 1 = долетело до края).
    let beatRings: number[] = []
    let lastBeatSeen = beatRef?.current ?? 0

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

      // Вспышка на удар ноты/пэда: счётчик изменился с прошлого кадра → мгновенная вспышка,
      // дальше экспоненциальное затухание (не звук, а прямой сигнал MIDI/клавиатуры — «один
      // девайс для звука И картинки», пульс виден даже раньше, чем FFT успеет его подхватить)
      const pulseNow = pulseRef?.current ?? 0
      if (pulseNow !== lastPulseSeen) {
        pulseEnergy = Math.min(pulseEnergy + 1, 1.6)
        lastPulseSeen = pulseNow
      }
      pulseEnergy *= 0.88

      // Кольцо-метроном: новый бит — новое кольцо рождается у ядра; все существующие кольца
      // продвигаются к краю канвы и удаляются по долёту (та же идея, что круги на воде от каждого удара).
      const beatNow = beatRef?.current ?? 0
      if (beatNow !== lastBeatSeen) {
        beatRings.push(0)
        lastBeatSeen = beatNow
      }
      beatRings = beatRings.map((phase) => phase + 0.02).filter((phase) => phase < 1)

      // Живые ручки SUB-патча — те же, что крутят звук (cutoff/резонанс/пространство)
      const azimuth = patchRef?.current?.engine.fx.space.azimuth ?? 0
      const depth = patchRef?.current?.engine.fx.space.depth ?? 0
      const cutoff = patchRef?.current?.engine.filter.cutoff ?? 0.5
      const resonance = patchRef?.current?.engine.filter.resonance ?? 0

      // Пустота Малевича — тёмный фон с едва заметным радиальным свечением от ядра
      ctx2d.fillStyle = VOID_BG
      ctx2d.fillRect(0, 0, w, h)
      const glow = ctx2d.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.6)
      glow.addColorStop(0, `rgba(212, 175, 55, ${0.05 + smoothBass * 0.12 + pulseEnergy * 0.08})`)
      glow.addColorStop(1, 'rgba(4, 3, 2, 0)')
      ctx2d.fillStyle = glow
      ctx2d.fillRect(0, 0, w, h)

      // Кольца-метроном — расходятся от центра к краю, ярче в начале пути, гаснут к финалу
      const maxRingRadius = Math.max(w, h) * 0.7
      for (const phase of beatRings) {
        ctx2d.strokeStyle = `rgba(245, 216, 90, ${0.35 * (1 - phase)})`
        ctx2d.lineWidth = 1.5
        ctx2d.beginPath()
        ctx2d.arc(cx, cy, phase * maxRingRadius, 0, Math.PI * 2)
        ctx2d.stroke()
      }

      const baseRadius = Math.min(w, h) * 0.22
      const coreRadius = baseRadius * (1 + smoothBass * 0.35 + pulseEnergy * 0.15)

      // Резонанс (звенящий фильтр) ускоряет вращение ядра — та же ручка, что даёт звуку «песок»
      coreAngleA += 0.004 + smoothMid * 0.02 + resonance * 0.03
      coreAngleB -= 0.004 + smoothMid * 0.02 + resonance * 0.03
      drawPenroseTriangle(cx, cy, coreRadius, coreAngleA, 0.5 + smoothBass * 0.5 + pulseEnergy * 0.3)
      drawPenroseTriangle(cx, cy, coreRadius, coreAngleB + Math.PI, 0.5 + smoothBass * 0.5 + pulseEnergy * 0.3)

      // 6 внешних узлов — эхо 6 операторов FM-движка; чем больше держится нот, тем шире орбита.
      // depth (пространство звука — «далеко»/«близко») слегка сжимает и приглушает орбиту, как
      // перспектива; azimuth (лево-право панорамы) поворачивает саму орбиту в ту же сторону.
      const nodeCount = 6
      const depthScale = 1 - depth * 0.25
      const orbitRadius = baseRadius * (2.2 + Math.min(activeNoteCountRef.current, 8) * 0.06) * depthScale
      const azimuthOffset = azimuth * Math.PI
      outerAngle += 0.0015 + smoothTreble * 0.01

      const positions: Array<{ x: number; y: number }> = []
      for (let i = 0; i < nodeCount; i++) {
        const a = outerAngle + azimuthOffset + (i / nodeCount) * Math.PI * 2
        positions.push({ x: cx + Math.cos(a) * orbitRadius, y: cy + Math.sin(a) * orbitRadius })
      }

      // Рёбра гексаграммы (каждый узел к узлу через один — рисует две наложенные треугольные звёзды).
      // cutoff (открытость фильтра — «занавеска яркости») подмешивается в яркость рёбер напрямую.
      ctx2d.lineWidth = 1
      for (let i = 0; i < nodeCount; i++) {
        const a = positions[i]
        const b = positions[(i + 2) % nodeCount]
        if (!a || !b) {
          continue
        }
        const grad = ctx2d.createLinearGradient(a.x, a.y, b.x, b.y)
        grad.addColorStop(0, `rgba(212, 175, 55, ${0.15 + smoothMid * 0.35 + cutoff * 0.15})`)
        grad.addColorStop(1, `rgba(245, 216, 90, ${0.05 + smoothMid * 0.2 + cutoff * 0.08})`)
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

      // Узлы — пульсируют от общей энергии + резкая вспышка на удар ноты/пэда
      for (const p of positions) {
        const r = 3 + bands.overall * 6 + pulseEnergy * 5
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
