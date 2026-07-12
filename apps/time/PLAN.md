# Time — План разработки

## Описание

Который час? — порядковый час от начала эпохи UNIX. 40 языков, числа прописью.
Празднование юбилейных часов (каждые 10 000) с уведомлениями по email.

## Инфраструктура

- [x] Создание приложения (Next.js 16 + Chakra UI v3)
- [x] Настройка темы (emerald green, Matrix-style)
- [x] Подключение Umami аналитики
- [x] Регистрация в инфраструктуре Dashboard
- [x] PostgreSQL (docker-compose.dev.yml, порт 5445)
- [x] Better Auth + OIDC (auth.letar.best)
- [x] ZenStack ORM (schema.zmodel, 3 модели: User, NotificationSubscription, NotificationLog)
- [x] Подключение @letar/auth и @letar/email

## Функциональность

- [x] Отображение текущего порядкового часа от UNIX эпохи
- [x] Русские порядковые числительные (numeralize-ru)
- [x] Автодетект языка (RU/EN через navigator.language)
- [x] Красивые числа (кратные 1000) — альтернативный формат
- [x] Обновление каждые 10 секунд

## Празднование юбилеев

- [x] Утилиты юбилеев (milestone.ts) — getCurrentUnixHour, getNextMilestone, getTimeToMilestone
- [x] Обратный отсчёт до следующего юбилея (countdown.tsx)
- [x] Анимация празднования (celebration.tsx) — конфетти + пульсация
- [x] CSS keyframes в теме Chakra (confetti-float, celebration-pulse)

## Уведомления

- [x] Кнопка подписки (subscribe-button.tsx)
- [x] Страница профиля с чекбоксами уведомлений (profile/page.tsx)
- [x] Server Actions: createSubscription, updateSubscription, deleteSubscription, getSubscription
- [x] Cron API для отправки уведомлений (api/cron/notifications)
- [x] Дедупликация через NotificationLog (@@unique)
- [x] Токен отписки (unsubscribeToken) — одноклик без авторизации

## Авторизация

- [x] Sign-in страница (OIDC авто-редирект)
- [x] User menu в toolbar (аватар, sign out)
- [x] Unsubscribe страница (по токену из email)

## Деплой

- [x] Зарегистрировать OIDC клиент time-prod в auth.letar.best
- [x] Создать .env.docker для production
- [x] Docker инфраструктура (Dockerfile.production + docker-compose.production.yml)
- [x] Перенести time на s2 (deploy-affected.sh, pull-env-docker.sh, dashboard seed)
- [x] Compose-миграция под zero-downtime rollout-профиль (§18.6 Сессия G, healthcheck/alias/
      DEPLOY_TAG/без container_name-ports; `doctor --app time` → 6/7 required ✅)
- [ ] Живой пилот rollout: включить `letar.rollout: 'true'` (сейчас закомментирован) →
      супервизируемый прод-деплой с непрерывным curl-мониторингом — см. корневой `PLAN.md` §18.6
- [ ] Исправить ошибку сборки: `number-to-words` не найден на сервере
- [ ] Исправить POSTGRES_PASSWORD в docker-compose
- [ ] Настроить crontab на s2
- [ ] Создать Umami website ID
- [ ] Добавить List-Unsubscribe заголовок в email
- [ ] Настроить NPM для time.letar.best на s2
- [ ] Деплой на s2

---

## Мультиязычность — 40 языков

### Фаза 1: Библиотека `@letar/number-words` (libs/number-words)

Публикуемая NPM-библиотека для преобразования чисел в слова на 40 языках.

**Движок:** `to-words` v5.3 (116 локалей, покрывает все 40 языков, tree-shakeable, 0 зависимостей)

**API библиотеки:**

```typescript
import { numberToOrdinal, numberToWords } from '@letar/number-words'

numberToWords(492_793, 'ru') // "четыреста девяносто две тысячи семьсот девяносто три"
numberToWords(492_793, 'de') // "vierhundertzweiundneunzigtausendsiebenhundertdreiundneunzig"
numberToWords(492_793, 'ja') // "四十九万二千七百九十三"
numberToWords(492_793, 'ar') // "أربعمائة و اثنان و تسعون ألف و سبعمائة و ثلاثة و تسعون"

numberToOrdinal(493, 'ru') // "четыреста девяносто третий"
numberToOrdinal(493, 'en') // "four hundred and ninety-third"
numberToOrdinal(493, 'ja') // "第四百九十三"
```

**Задачи:**

- [ ] Создать `libs/number-words/` (структура: package.json, project.json, tsconfig.json)
- [ ] Установить `to-words` как зависимость
- [ ] Обёртка `numberToWords(n, locale)` — кардинальные числительные
- [ ] Обёртка `numberToOrdinal(n, locale)` — порядковые числительные
- [ ] Порядковые правила по языкам:
  - **ru** — перенести существующий `switchToOrdinal()` из page.tsx
  - **en** — суффиксы (-st, -nd, -rd, -th) к последнему слову
  - **de** — суффикс "-ste"/"-te" (drei → dritte, hundert → hundertste)
  - **fr** — premier/deuxième/troisième / суффикс "-ième"
  - **es** — суффикс "-o"/"-a" (primero, segundo, tercero...)
  - **pt** — суффикс "-o"/"-a" (primeiro, segundo, terceiro...)
  - **ja** — префикс "第" (第四百九十三)
  - **zh** — префикс "第" (第四百九十三)
  - **ko** — суффикс "번째" (사백구십삼번째)
  - **ar** — кардинальная форма (порядковые сложные, использовать кардинал)
  - **hi** — суффикс "-वाँ"/"-वीं" (वां/वें)
  - **tr** — суффиксы -inci/-ıncı/-üncü/-uncu (гармония гласных)
  - **pl** — суффикс "-y"/"-a" (четыреста девяноста trzeci)
  - **uk** — аналогично русскому, своя таблица
  - **be** — аналогично русскому/украинскому
  - **kk** — суффикс "-інші"/"-ыншы"
  - **uz** — суффикс "-inchi"/"-nchi"
  - **tg** — суффикс "-ум"/"-юм"
  - **ky** — суффикс "-инчи"/"-ынчы"
  - **tk** — суффикс "-inji"/"-ynjy"
  - **az** — суффикс "-inci"/"-ıncı"/"-üncü"/"-uncu"
  - **hy** — суффикс "-ерորդ" / "-րdelays"
  - **ka** — суффикс "-ე" (მეოთხასე...)
  - **ro** — al/a + lea/a (al patrusute nouăzeci și treilea)
  - **fa** — суффикс "-م"/"-ام" (ум/ам)
  - **bn** — суффикс "-তম" / "-ম" (প্রথম, দ্বিতীয়, তৃতীয়...)
  - **id** — префикс "ke-" (keempat ratus sembilan puluh tiga)
  - **ms** — префикс "ke-" (keempat ratus sembilan puluh tiga)
  - **vi** — префикс "thứ" (thứ bốn trăm chín mươi ba)
  - **th** — префикс "ที่" (ที่สี่ร้อยเก้าสิบสาม)
  - **sw** — кардинальная форма (порядковые = "ya" + кардинал)
  - **nl** — суффикс "-ste"/"-de" (vierhonderddrieënnegentigste)
  - **sv** — суффикс "-e"/"-a" (fyrahundranittiotredje)
  - **it** — суффикс "-esimo"/"-esima" (quattrocentonovantatreesimo)
  - **el** — суффикс "-οστός"/"-ος" (τετρακοσιοστός ενενηκοστός τρίτος)
  - **he** — кардинальная форма (порядковые только до 10 в иврите)
  - **ur** — суффикс "-واں" (وان/ویں)
  - **mr** — суффикс "-वा"/"-वी" (वां/वें)
  - **ta** — суффикс "-ஆவது" / "-ām" (நானூற்றி தொண்ணூற்றி மூன்றாவது)
  - **te** — суффикс "-వ" (నాలుగు వందల తొంభై మూడవ)
- [ ] Маппинг локалей `to-words` ↔ ISO 639-1 (некоторые коды отличаются)
- [ ] Fallback: если порядковое не реализовано — вернуть кардинальное
- [ ] Unit-тесты (Vitest) — каждый язык, edge cases (0, 1, 1000, 999999)
- [ ] README.md с примерами использования

**Структура:**

```
libs/number-words/
├── src/
│   ├── index.ts              # экспорт: numberToWords, numberToOrdinal
│   ├── lib/
│   │   ├── cardinal.ts       # обёртка to-words
│   │   ├── ordinal.ts        # dispatch по локалям
│   │   ├── types.ts          # SupportedLocale type
│   │   └── ordinals/
│   │       ├── ru.ts         # русские порядковые
│   │       ├── en.ts         # английские порядковые
│   │       ├── de.ts         # немецкие порядковые
│   │       ├── fr.ts         # французские порядковые
│   │       ├── ja.ts         # японские (第 + cardinal)
│   │       ├── zh.ts         # китайские (第 + cardinal)
│   │       ├── ...           # и т.д. для каждого языка
│   │       └── index.ts      # реестр ordinal handlers
│   └── __tests__/
│       ├── cardinal.test.ts
│       └── ordinal.test.ts
├── package.json              # @letar/number-words, version 0.1.0
├── project.json              # Nx: test, lint, build targets
├── tsconfig.json
├── tsconfig.lib.json
└── README.md
```

**Публикация NPM (отдельный шаг после стабилизации):**

- [ ] Настроить Nx publishable library (build → dist)
- [ ] Добавить np или changesets для версионирования
- [ ] `npm publish --access public` как `@letar/number-words`

### Фаза 2: Переводы time app (40 файлов сообщений)

**Полный список языков (40):**

| #  | Код | Язык        | Нативное название | Носители | RTL | Группа          |
| -- | --- | ----------- | ----------------- | -------- | --- | --------------- |
| 1  | ru  | Russian     | Русский           | 250M     | -   | Славянские      |
| 2  | en  | English     | English           | 1.5B     | -   | Германские      |
| 3  | fr  | French      | Français          | 320M     | -   | Романские       |
| 4  | de  | German      | Deutsch           | 130M     | -   | Германские      |
| 5  | ja  | Japanese    | 日本語            | 125M     | -   | Японские        |
| 6  | zh  | Chinese     | 中文              | 1.1B     | -   | Синитские       |
| 7  | ar  | Arabic      | العربية           | 370M     | RTL | Семитские       |
| 8  | ko  | Korean      | 한국어            | 80M      | -   | Корейские       |
| 9  | es  | Spanish     | Español           | 550M     | -   | Романские       |
| 10 | pt  | Portuguese  | Português         | 260M     | -   | Романские       |
| 11 | hi  | Hindi       | हिन्दी             | 600M     | -   | Индоарийские    |
| 12 | tr  | Turkish     | Türkçe            | 80M      | -   | Тюркские        |
| 13 | pl  | Polish      | Polski            | 45M      | -   | Славянские      |
| 14 | uk  | Ukrainian   | Українська        | 40M      | -   | Славянские      |
| 15 | be  | Belarusian  | Беларуская        | 5M       | -   | Славянские      |
| 16 | kk  | Kazakh      | Қазақша           | 13M      | -   | Тюркские        |
| 17 | uz  | Uzbek       | Oʻzbekcha         | 35M      | -   | Тюркские        |
| 18 | tg  | Tajik       | Тоҷикӣ            | 8M       | -   | Иранские        |
| 19 | ky  | Kyrgyz      | Кыргызча          | 4M       | -   | Тюркские        |
| 20 | tk  | Turkmen     | Türkmençe         | 7M       | -   | Тюркские        |
| 21 | az  | Azerbaijani | Azərbaycanca      | 23M      | -   | Тюркские        |
| 22 | hy  | Armenian    | Հայերեն           | 6M       | -   | Армянские       |
| 23 | ka  | Georgian    | ქართული           | 4M       | -   | Картвельские    |
| 24 | ro  | Romanian    | Română            | 24M      | -   | Романские       |
| 25 | fa  | Persian     | فارسی             | 110M     | RTL | Иранские        |
| 26 | bn  | Bengali     | বাংলা             | 270M     | -   | Индоарийские    |
| 27 | id  | Indonesian  | Bahasa Indonesia  | 200M     | -   | Австронезийские |
| 28 | ms  | Malay       | Bahasa Melayu     | 80M      | -   | Австронезийские |
| 29 | vi  | Vietnamese  | Tiếng Việt        | 85M      | -   | Вьет-мыонг      |
| 30 | th  | Thai        | ภาษาไทย           | 70M      | -   | Тай-кадайские   |
| 31 | sw  | Swahili     | Kiswahili         | 100M     | -   | Банту           |
| 32 | nl  | Dutch       | Nederlands        | 25M      | -   | Германские      |
| 33 | sv  | Swedish     | Svenska           | 10M      | -   | Германские      |
| 34 | it  | Italian     | Italiano          | 65M      | -   | Романские       |
| 35 | el  | Greek       | Ελληνικά          | 13M      | -   | Греческие       |
| 36 | he  | Hebrew      | עברית             | 9M       | RTL | Семитские       |
| 37 | ur  | Urdu        | اردو              | 230M     | RTL | Индоарийские    |
| 38 | mr  | Marathi     | मराठी             | 83M      | -   | Индоарийские    |
| 39 | ta  | Tamil       | தமிழ்              | 75M      | -   | Дравидийские    |
| 40 | te  | Telugu      | తెలుగు             | 82M      | -   | Дравидийские    |

**Суммарный охват: ~6.5 млрд человек, 4 RTL языка (ar, fa, he, ur), 14 языковых семей, 18 письменностей**

**Задачи:**

- [ ] Создать 38 файлов `messages/{locale}.json` (ru и en уже есть)
- [ ] Каждый файл: metadata, time, countdown, celebration, subscribe, profile, unsubscribe
- [ ] Plural rules для каждого языка (ICU MessageFormat):
  - **one/other**: en, de, es, pt, fr, it, nl, sv, el, hi, bn, ur, mr, tr, kk, uz, tg, ky, tk, az, hy, ka, fa, sw, ta, te
  - **one/few/many/other**: ru, uk, be, pl
  - **zero/one/two/few/many/other**: ar, he
  - **Нет plural**: ja, zh, ko, vi, th, id, ms
- [ ] Обновить `routing.ts` — добавить все 40 локалей
- [ ] Обновить `generateStaticParams()` в layout.tsx
- [ ] Обновить alternateLocales в metadata

### Фаза 3: Рефакторинг page.tsx

**Текущие проблемы:**

- Хардкод `locale === 'ru'` в рендеринге
- Отдельные функции `toOrdinalRussian()` и `toEnglishWords()`
- `number-to-words` и `numeralize-ru` как прямые зависимости

**Задачи:**

- [ ] Заменить `number-to-words` и `numeralize-ru` на `@letar/number-words`
- [ ] Удалить хардкод `locale === 'ru'` — единый вызов `numberToOrdinal(hour, locale)`
- [ ] Удалить локальные функции `toOrdinalRussian()`, `toEnglishWords()`, `switchToOrdinal()`
- [ ] Обновить `package.json` — убрать `number-to-words`, добавить `@letar/number-words`
- [ ] Плюрализация через `t()` с ICU (уже работает через next-intl)

### Фаза 4: RTL и UI

**RTL языки:** ar (Arabic), fa (Persian), he (Hebrew), ur (Urdu)

**Задачи:**

- [ ] Утилита `isRtlLocale(locale)` — проверка RTL по списку `['ar', 'fa', 'he', 'ur']`
- [ ] `dir={isRtlLocale(locale) ? 'rtl' : 'ltr'}` в layout.tsx
- [ ] Тестирование RTL для арабского, персидского, иврита, урду
- [ ] Селектор языка в toolbar (выпадающий список, сгруппированный по регионам)
- [ ] Сохранение выбора языка в cookie (next-intl поддерживает из коробки)
- [ ] Автодетект языка браузера (Accept-Language → ближайший из 40)

### Фаза 5: Тестирование

- [ ] Unit-тесты `@letar/number-words` — все 40 языков
- [ ] Визуальная проверка каждого языка (preview)
- [ ] E2E тест переключения языков
- [ ] Проверка SEO: hreflang для каждой локали

### Фаза 6: Деплой

- [ ] Исправить ошибку сборки number-to-words на s2
- [ ] Исправить POSTGRES_PASSWORD в docker-compose
- [ ] Собрать и задеплоить time на s2
- [ ] Настроить NPM time.letar.best
- [ ] Создать Umami website ID
- [ ] Настроить crontab
