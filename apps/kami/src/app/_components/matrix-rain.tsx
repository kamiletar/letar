'use client'

import { type CeremonyRunner, createCeremonyRunner, getCatcherPose, getFlightDuration } from '@/lib/entry-ceremony'
import { createEntryDom } from '@/lib/entry-dom'
import {
  BURST_DURATION,
  createMatrixRenderer,
  getBurstStrength,
  type MatrixCatcher,
  type MatrixZone,
  pickCatcherSource,
} from '@/lib/matrix-scene'
import { Box } from '@chakra-ui/react'
import { trackEvent } from '@letar/analytics'
import { useEffect, useRef } from 'react'

/**
 * Рецепты традиционной кухни на разных письменностях.
 * Вдохновлено оригинальной Matrix, где авторы спрятали рецепт суши в символах.
 * Каждый столбец дождя показывает текст рецепта на одном из языков.
 * Пробелы и пунктуация убраны для визуальной плотности (кроме JS/BF).
 */
export const RECIPES: string[] = [
  // Японский — рецепт суши (катакана + хирагана + кандзи)
  'すしのつくりかたまずこめをよくあらいざるにあげてさんじゅっぷんおくつぎにこめをたいてすしずをまぜるさかなをうすくきりのりのうえにごはんをしきさかなをのせてまくわさびとしょうゆをそえてかんせい',
  // Китайский — пекинская утка
  '北京烤鸭的做法将鸭子清洗干净用开水烫过表皮然后挂起来风干一夜烤之前在鸭皮上刷一层麦芽糖水放入烤炉中用果木炭火烤制约四十分钟至皮脆肉嫩取出后将鸭皮片成薄片配上甜面酱葱丝黄瓜条用薄饼卷着吃',
  // Корейский — кимчи
  '김치만드는법배추를반으로갈라소금물에절인다여섯시간후깨끗이씻어물기를빼고고춧가루마늘생강젓갈설탕을섞어양념을만든다배추잎사이사이에양념을골고루바른후항아리에꼭꼭눌러담고뚜껑을덮어서늘한곳에서이틀간숙성시킨다',
  // Арабский — хумус
  'طريقةعملالحمصانقعالحمصفيالماءطوالالليلثماسلقهحتىينضجتماماصفهواتركهيبردضعهفيالخلاطمعالطحينةوعصيرالليمونوالثوموالملحاخلطحتىيصبحناعماوزينهبزيتالزيتونوالبابريكاوقدمهمعالخبزالطازج',
  // Иврит — шакшука
  'שקשוקהמחממיםשמןזיתבמחבתמוסיפיםבצלקצוץומטגניםעדשהואשקוףמוסיפיםשוםכתושפלפלאדוםחתוךועגבניותמרוסקותמתבליםבכמוןפפריקהמלחופלפלמבשליםעדשהרוטבמסמיךעושיםגומחותבתערובתושובריםביציםלתוכןמכסיםומבשליםעדשהביציםנקרשות',
  // Деванагари — бирьяни
  'बिरयानीबनानेकीविधिचावलकोधोकरआधेघंटेभिगोएंप्यांजकोबारीककाटकरसुनहराभूनेंअदरकलहसुनकापेस्टडालेंमसालेडालकरमटनपकाएंचावलकोआधाउबालेंपरतोंमेंचावलऔरमटनसजाएंकेसरवालादूधडालेंढककरदमपरपकाएं',
  // Тайский — том-ям
  'วิธีทำต้มยำกุ้งต้มน้ำให้เดือดใส่ข่าตะไคร้ใบมะกรูดฉีกพริกขี้หนูบุบเห็ดฟางหอมแดงรอน้ำเดือดใส่กุ้งสดปรุงรสด้วยน้ำปลาน้ำมะนาวพริกเผาตักใส่ชามโรยผักชีใบมะกรูดซอย',
  // Грузинский — хинкали
  'ხინკალისრეცეპტიფქვილსდაუმატეთმარილიდაწყალიმოზილეთცომისანამგლუვიგახდებახორცისშიგთავსისათვისდაქუცმაცეთხორციდაამატეთხახვიქინძიწიწაკამარილიპილპილიცომიგააბრტყელეთშიგთავსიჩადეთდაკეცეთხინკალისფორმაზემოხარშეთდუღილმარილიანწყალში',
  // Эфиопский/Геэз — инджера с доро-ват
  'የእንጀራአሰራርየጤፍዱቄትከውሃጋርቀላቅሎሶስትቀንአስቡኳቸውእስኪያመልክተውድረስይጠብቁከዚያምቅቤበምጣድላይጠቀሙእናሊጥውንበክብአፍስሰውያጋግሩየዶሮወጥለማዘጋጀትበርበሬበቅቤላይቀላቅሉዶሮውንጨምሩእስኪበስልድረስያብስሉ',
  // Тамильский — доса с чатни
  'தோசைசெய்முறைஅரிசிமற்றும்உளுந்துநான்குமணிநேரமூறவைக்கவும்பிறகுநைசாகஅரைத்துமாவாக்கவும்உப்புசேர்த்துஒருஇரவுபுளிக்கவிடவும்தோசைக்கல்லைகாயவைத்துமாவைவட்டமாகஊற்றிஇருபுறமும்வேகவிடவும்தேங்காய்சட்னியுடன்பரிமாறவும்',
  // Тибетский — масляный чай (бо-ча)
  'བོད་ཇའི་བཟོ་ཐབས་ཇ་མ་དེ་ཆུ་ནང་བསྐོལ་ནས་ཇ་ཁུ་ཤུགས་ཆེན་པོ་ཞིག་བཟོས་ཤིང་དེ་ནས་མར་དང་ཚྭ་བཏབ་སྟེ་མདོང་མོའི་ནང་བླུགས་ནས་ལེགས་པར་བསྲེས་དགོས་ཇ་དེ་དྲོན་མོ་ཡོད་དུས་བཏུང་ན་ཡག',
  // Телугу — пулихора (рис с тамариндом)
  'పులిహోరతయారీవిధానంబియ్యంకడిగిఅన్నంవండండిచింతపండునీళ్ళలోనానబెట్టిరసంతీయండివేరుశనగపప్పుశనగపప్పుమినపప్పువేయించండిఆవాలుకరివేపాaborకుఎర్రమిర్చులువేయించిచింతపండురసంపోసిపసుపుఉప్పువేసిమరగనివ్వండిచల్లారినఅన్నంలోకలపండి',
  // Маратхи — пуран поли (сладкие лепёшки)
  'पुरणपोळीचीकृतीचणाडाळभिजतघालाशिजवूनगाळाबारीककरागूळघालूनपुरणतयारकरामैद्याचेकणकुमळूनघट्टपीठमळागोळेकरापुरणभरानलाटापोळीतव्यावरतूपलावूनभाजाउरलेलेतूपआणिदूधसोबतगरमगरमवाढा',
  // Греческий — мусака
  'ΣυνταγήμουσακάΚόψτετιςμελιτζάνεςσεφέτεςαλατίστετιςκαιτηγανίστετιςΣοτάρετετονκιμάμεκρεμμύδισκόρδοντομάταΣτρώστεστοταψίμελιτζάνεςκιμάπατάτεςΕτοιμάστεμπεσαμέλμεγάλααυγάβούτυροαλεύριΧύστεαπόπάνωκαιψήστεστονφούρνο',
  // Бенгальский — рошоголла (сладкие шарики)
  'রসগোল্লারপ্রণালীদুধফুটিয়েলেবুররসদিয়েছানাকাটুনছানানিংড়েমসৃণকরেগোলগোলবলতৈরিকরুনচিনিরসিরাবানিয়েফুটতেদিনসিরায়রসগোল্লাদিয়েঢাকনাদিয়েকুড়িমিনিটসেদ্ধকরুনঠান্ডাকরেপরিবেশনকরুন',
  // Binary — рецепт борща в двоичном коде
  '1100001011001001101100001110000010110000101011011101000010110001101000001011011010110000101101001011000001011010110100001011001010110001101100001011000010110100101100010110000101100010110100101100001011010010110001101100001011010010110100',
  // Hex — рецепт пельменей в шестнадцатеричном коде
  '0f0a7e9b3c5d2a8f1e6b4c0d9a3f7e5b2c8d1a6f4e0b9c3d7a5e2f8b1c6d4a0e9f3b7c5d2a8e1f6b4c0d9a3e7f5b2c8d1a6e4f0b9c3d7a5f2e8b1c6d4a0f9e3b7c5d2a8f1e6b4c0d',
  // JavaScript — фрагменты кода Matrix rain
  'constmatrix=[...Array(cols)].map(()=>({y:Math.random()*-100,speed:Math.random()*2+1}));functionrender(ctx){ctx.fillStyle="rgba(0,0,0,0.05)";ctx.fillRect(0,0,w,h);matrix.forEach((drop,i)=>{constchar=String.fromCharCode(0x30A0+Math.random()*96);ctx.fillText(char,i*size,drop.y*size);drop.y+=drop.speed;if(drop.y*size>h)drop.y=0;});}',
  // BrainFuck — Hello World
  '++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++.',
]

/** Выбранный цикл A → B → C; интерфейс и ссылки не зависят от готовности canvas. */
export function MatrixRain({ theme, home = false }: { theme: string | undefined; home?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const timeRef = useRef(0)
  const homeRef = useRef(home)
  const zoneRef = useRef<() => void>(() => {})
  // Церемония живёт дольше одного прогона эффекта: смена темы не должна запускать её заново.
  const runnerRef = useRef<CeremonyRunner | null>(null)
  const finalizeRef = useRef<(kind: 'complete' | 'skip' | 'abort') => void>(() => {})
  useEffect(() => {
    homeRef.current = home
    zoneRef.current()
    // Ушли с главной посреди церемонии: слои остаются на странице, поэтому возвращаем им естественный вид.
    if (!home && runnerRef.current && runnerRef.current.phase !== 'done') {
      runnerRef.current.finish()
      finalizeRef.current('abort')
    }
  }, [home])
  useEffect(() => () => finalizeRef.current('abort'), [])

  useEffect(() => {
    const canvas = canvasRef.current
    const host = hostRef.current
    if (!canvas || !host || !theme) { return }
    const ctx = canvas.getContext('2d')
    if (!ctx) { return }

    const root = document.documentElement
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    const colors = getComputedStyle(host)
    const renderer = createMatrixRenderer(ctx, RECIPES, {
      background: colors.backgroundColor,
      ink: colors.color,
      head: getComputedStyle(canvas).color,
    })
    const dom = createEntryDom(document, theme)

    // Режим решает ранний скрипт в <head> (атрибут на <html>): вход играет только при первой загрузке на главной.
    if (!runnerRef.current) {
      const flag = root.dataset.kamiEntry
      const mode = homeRef.current && !motion.matches && (flag === 'full' || flag === 'short') ? flag : 'none'
      const created = createCeremonyRunner(mode, dom.counts)
      runnerRef.current = created
      if (mode === 'none') {
        delete root.dataset.kamiEntry
      } else {
        // Строка «шрифты» ждёт настоящего события; если API нет, считаем шрифты готовыми.
        const fonts = document.fonts?.ready ?? Promise.resolve()
        void fonts.then(() => created.markFontsReady(), () => created.markFontsReady())
      }
    }
    const runner = runnerRef.current
    let lastState = runner.state()
    let clockStarted = false
    let ended = runner.phase === 'done'

    let raf = 0
    let warmTimer = 0
    let warmed = false
    let last = 0
    let lastDraw = 0
    let width = 0
    let height = 0
    let dpr = Math.min(devicePixelRatio || 1, 1.5)
    let reducedDensity = false
    let samples = 0
    let paintAverage = 0
    let disposed = false
    let zone: MatrixZone | null = null
    let burst: { x: number; y: number; start: number } | null = null
    let letters = dom.measureLetters(host.getBoundingClientRect())
    // Источник каждого ловца выбирается один раз на старте его полёта и дальше не накапливает состояние.
    let sources: (ReturnType<typeof pickCatcherSource> | undefined)[] = []

    const finalize = (kind: 'complete' | 'skip' | 'abort') => {
      if (ended && !root.dataset.kamiEntry) { return }
      ended = true
      dom.clear()
      delete root.dataset.kamiEntry
      delete root.dataset.kamiEntryRun
      lastState = runner.state()
      if (kind !== 'abort') { trackEvent(kind === 'skip' ? 'entry-skip' : 'entry-complete', { mode: runner.mode }) }
    }
    finalizeRef.current = finalize
    const active = () => runner.phase !== 'done'

    const measureZone = () => {
      const nav = homeRef.current ? document.querySelector('[data-testid="home-menu"] nav') : null
      const hostBox = host.getBoundingClientRect()
      letters = dom.measureLetters(hostBox)
      sources = []
      if (!nav) {
        zone = null
        return
      }
      const box = nav.getBoundingClientRect()
      zone = { x: box.left - hostBox.left, y: box.top - hostBox.top, w: box.width, h: box.height }
    }
    zoneRef.current = () => {
      measureZone()
      draw()
    }
    const skip = () => {
      if (runner.phase !== 'running') { return }
      runner.skip()
      lastState = runner.state()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { skip() }
    }
    // Клик по пустому месту завершает церемонию и не переходит по ссылке (кнопка «Пропустить» сама шлёт событие).
    // Клик по уже проявившемуся пункту меню (≥ 0,5) — пропуск входа и сразу выбор пункта (KM-031).
    // Клики с модификаторами и не основной кнопкой — штатное поведение браузера.
    const onClick = (event: MouseEvent) => {
      if (!active() || !homeRef.current) { return }
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) { return }
      const target = event.target instanceof Element ? event.target : null
      if (target?.closest('[data-entry-skip]')) { return }
      const menuLink = target?.closest('[data-testid="home-menu"] a[data-entry-menu]') ?? null
      const interactive = target?.closest('a, button, input, select, textarea, [role="button"]')
      if (interactive && !menuLink) { return }
      event.preventDefault()
      event.stopPropagation()
      const index = Number(menuLink?.getAttribute('data-entry-index'))
      const visible = menuLink !== null && (lastState.menuItems[index] ?? 0) >= .5
      skip()
      if (visible) { window.dispatchEvent(new CustomEvent('kami:menu-activate', { detail: { index } })) }
    }
    // Выбор пункта: буквы фона расходятся от него; геометрия потоков по-прежнему зависит только от времени.
    const onSelect = (event: Event) => {
      const { x, y } = (event as CustomEvent<{ x: number; y: number }>).detail
      const hostBox = host.getBoundingClientRect()
      burst = { x: x - hostBox.left, y: y - hostBox.top, start: timeRef.current }
      host.dataset.matrixBurst = ''
    }

    const catchersFor = (): MatrixCatcher[] => {
      const result: MatrixCatcher[] = []
      const flight = getFlightDuration(runner.mode)
      lastState.catchers.forEach((progress, i) => {
        const target = letters[i]
        if (!target || progress <= 0 || progress >= 1) { return }
        if (sources[i] === undefined) {
          sources[i] = pickCatcherSource(
            timeRef.current - progress * flight,
            width,
            height,
            RECIPES,
            target,
            reducedDensity,
          )
        }
        const source = sources[i]
        if (!source) { return }
        const pose = getCatcherPose(progress, source, target, Math.min(3, Math.max(1, target.size * .9 / 32)))
        result.push({ char: source.char, layer: source.layer, head: source.head, ...pose })
      })
      return result
    }

    const draw = () => {
      // Разлёт одноразовый: затух или ушли с главной — сбрасываем, иначе после возврата на месте выбора пятно.
      if (burst && (!homeRef.current || timeRef.current - burst.start >= BURST_DURATION)) {
        burst = null
        delete host.dataset.matrixBurst
      }
      const entry = homeRef.current
        ? {
          elapsed: runner.revealElapsed,
          zone,
          calm: lastState.calm,
          catchers: active() ? catchersFor() : undefined,
          burst: burst
            ? { x: burst.x, y: burst.y, strength: getBurstStrength(timeRef.current - burst.start) }
            : undefined,
        }
        : undefined
      return renderer.draw(motion.matches ? 0 : timeRef.current, width, height, reducedDensity, entry)
    }
    const resize = () => {
      const bounds = host.getBoundingClientRect()
      width = Math.max(1, bounds.width)
      height = Math.max(1, bounds.height)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      measureZone()
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw()
    }
    const tick = (now: number) => {
      if (disposed || document.hidden || motion.matches) {
        raf = 0
        return
      }
      const delta = last ? Math.min((now - last) / 1000, .1) : 0
      timeRef.current += delta
      // Часы церемонии идут только после готовности атласа глифов: до этого холст честно остаётся фоном.
      if (active() && homeRef.current && (warmed || runner.phase === 'skipping')) {
        if (!clockStarted && warmed) {
          clockStarted = true
          runner.markAtlasReady()
          root.dataset.kamiEntryRun = '1'
        }
        runner.advance(delta)
        lastState = runner.state()
        dom.apply(lastState)
        if (!active()) { finalize(runner.skipped ? 'skip' : 'complete') }
      }
      last = now
      // Пока играет церемония, рисуем каждый кадр: полёт ловца за 0,25 с не должен идти на 30 fps.
      if (active() || now - lastDraw >= 1000 / 30) {
        const cost = draw()
        lastDraw = now
        if (warmed) {
          paintAverage = paintAverage * .9 + cost * .1
          samples++
          // Сначала ограничиваем разрешение и плотность, сохраняя сам цикл A → B → C.
          if (samples > 60 && paintAverage > 12 && !reducedDensity) {
            reducedDensity = true
            dpr = 1
            resize()
          }
        }
      }
      raf = requestAnimationFrame(tick)
    }
    const warm = () => {
      if (disposed || document.hidden) { return }
      warmed = renderer.warm()
      draw()
      if (!warmed) { warmTimer = window.setTimeout(warm, 8) }
    }
    const stop = () => {
      cancelAnimationFrame(raf)
      clearTimeout(warmTimer)
      raf = 0
      last = 0
    }
    const resume = () => {
      stop()
      if (disposed || document.hidden) { return }
      // Включили reduced-motion посреди церемонии: сразу финальный кадр.
      if (motion.matches && active()) {
        runner.finish()
        finalize('abort')
      }
      if (!warmed) { warmTimer = window.setTimeout(warm, 0) }
      draw()
      if (!motion.matches) { raf = requestAnimationFrame(tick) }
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    document.addEventListener('visibilitychange', resume)
    window.addEventListener('pagehide', stop)
    window.addEventListener('pageshow', resume)
    motion.addEventListener('change', resume)
    window.addEventListener('keydown', onKey)
    window.addEventListener('kami:entry-skip', skip)
    window.addEventListener('kami:menu-select', onSelect)
    document.addEventListener('click', onClick, true)
    if (!active() && root.dataset.kamiEntry) { finalize('abort') }
    resize()
    resume()
    return () => {
      disposed = true
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('kami:entry-skip', skip)
      window.removeEventListener('kami:menu-select', onSelect)
      document.removeEventListener('click', onClick, true)
      stop()
      observer.disconnect()
      document.removeEventListener('visibilitychange', resume)
      window.removeEventListener('pagehide', stop)
      window.removeEventListener('pageshow', resume)
      motion.removeEventListener('change', resume)
    }
  }, [theme])

  return (
    <Box
      ref={hostRef}
      position="absolute"
      inset={0}
      bg="bg"
      color={{ base: 'fg.700', _dark: 'fg.500' }}
      aria-hidden="true"
      css={{
        backgroundImage:
          'radial-gradient(ellipse at 85% 30%, color-mix(in srgb, var(--chakra-colors-fg-700) 12%, transparent), transparent 70%)',
      }}
    >
      <Box asChild position="absolute" inset={0} w="full" h="full" color={{ base: 'fg.900', _dark: 'fg.200' }}>
        <canvas ref={canvasRef} />
      </Box>
    </Box>
  )
}
