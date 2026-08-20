'use client'

import { Box } from '@chakra-ui/react'
import { breakpoints, useMediaQuery } from '@letar/hooks'
import { useCallback, useEffect, useRef, useState } from 'react'

interface MatrixRainProps {
  /** Цвет символов (по умолчанию Matrix green) */
  color?: string
  /** Размер шрифта в пикселях */
  fontSize?: number
  /** Скорость падения (меньше = быстрее) */
  speed?: number
  /** Прозрачность фона для trail-эффекта */
  fadeOpacity?: number
  /** RGB-компоненты фона для trail-эффекта (по умолчанию '0, 0, 0') */
  bgRgb?: string
  /** Класс для canvas */
  className?: string
}

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

export function MatrixRain({
  color = '#00FF41',
  fontSize = 1,
  speed = 50,
  fadeOpacity = 0.05,
  bgRgb = '0, 0, 0',
  className,
}: MatrixRainProps) {
  console.log(fontSize)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | undefined>(undefined)
  const dropsRef = useRef<number[]>([])
  /** Индекс рецепта для каждого столбца */
  const columnRecipeRef = useRef<number[]>([])
  /** Позиция внутри текста рецепта для каждого столбца */
  const columnCharIdxRef = useRef<number[]>([])
  const [isVisible, setIsVisible] = useState(true)
  const prefersReducedMotion = useMediaQuery(breakpoints.prefersReducedMotion)

  // Инициализация капель — каждому столбцу назначается случайный рецепт
  const initDrops = useCallback((columns: number) => {
    dropsRef.current = Array.from({ length: columns }, () => Math.random() * -100)
    columnRecipeRef.current = Array.from({ length: columns }, () => Math.floor(Math.random() * RECIPES.length))
    columnCharIdxRef.current = Array.from(
      { length: columns },
      () => Math.floor(Math.random() * 100), // случайная стартовая позиция в тексте
    )
  }, [])

  // Рисование одного кадра
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      // Затемняем предыдущий кадр для создания trail-эффекта
      ctx.fillStyle = `rgba(${bgRgb}, ${fadeOpacity})`
      ctx.fillRect(0, 0, width, height)

      // Настройки текста
      ctx.fillStyle = color
      ctx.font = `${fontSize}px monospace`

      const columns = Math.floor(width / fontSize)

      // Рисуем каждый столбец — символ берётся последовательно из рецепта
      for (let i = 0; i < columns; i++) {
        const recipe = RECIPES[columnRecipeRef.current[i]]
        const charIdx = columnCharIdxRef.current[i] % recipe.length
        const char = recipe[charIdx]
        columnCharIdxRef.current[i]++

        // Позиция
        const x = i * fontSize
        const y = dropsRef.current[i] * fontSize

        // Рисуем символ
        ctx.fillText(char, x, y)

        // Сброс капли — назначаем новый случайный рецепт
        if (y > height && Math.random() > 0.975) {
          dropsRef.current[i] = 0
          columnRecipeRef.current[i] = Math.floor(Math.random() * RECIPES.length)
          columnCharIdxRef.current[i] = Math.floor(Math.random() * 100)
        }

        // Двигаем каплю вниз
        dropsRef.current[i]++
      }
    },
    [color, fontSize, fadeOpacity, bgRgb],
  )

  // Обработка resize
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const parent = canvas.parentElement
    if (!parent) {
      return
    }

    canvas.width = parent.clientWidth
    canvas.height = parent.clientHeight

    const columns = Math.floor(canvas.width / fontSize)
    initDrops(columns)
  }, [fontSize, initDrops])

  // Intersection Observer для visibility check
  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), { threshold: 0.1 })

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // Основной эффект (пропускаем если reduced motion)
  useEffect(() => {
    if (prefersReducedMotion) {
      return
    }
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    // Инициализация размеров
    handleResize()

    // Заливаем canvas начальным цветом фона
    ctx.fillStyle = `rgb(${bgRgb})`
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Анимация
    let lastTime = 0
    const animate = (currentTime: number) => {
      if (currentTime - lastTime >= speed) {
        draw(ctx, canvas.width, canvas.height)
        lastTime = currentTime
      }
      animationRef.current = requestAnimationFrame(animate)
    }

    // Запускаем анимацию только если элемент видим
    if (isVisible) {
      animationRef.current = requestAnimationFrame(animate)
    }

    // Обработчик resize
    window.addEventListener('resize', handleResize)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      window.removeEventListener('resize', handleResize)
    }
  }, [draw, handleResize, speed, isVisible, prefersReducedMotion, bgRgb])

  // Если prefers-reduced-motion, показываем статичный градиент
  if (prefersReducedMotion) {
    return (
      <Box
        position="absolute"
        inset={0}
        bg={{
          base: 'linear-gradient(180deg, var(--chakra-colors-gray-50) 0%, rgba(249,250,251,0.9) 50%, transparent 100%)',
          _dark: 'linear-gradient(180deg, black 0%, rgba(0,0,0,0.9) 50%, transparent 100%)',
        }}
        zIndex={0}
        aria-hidden="true"
      />
    )
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
      }}
      aria-hidden="true"
    >
      <Box asChild filter={'blur(.5px)'} animation={'matrix-zoom 30s infinite ease'}>
        <canvas
          ref={canvasRef}
          className={className}
          style={{
            transformOrigin: 'center center',
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '50%',
            height: '50%',
            zIndex: 0,
            scale: '1',
          }}
        />
      </Box>
    </div>
  )
}
