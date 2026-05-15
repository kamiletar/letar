# Filecoin Cold Storage — Техническое задание

## Цель

Использовать Filecoin как бесплатное холодное хранилище для всего каталога аниме. При потере сидов — автоматическое восстановление через IPFS retrieval от Storage Providers. Донаты пользователей в FIL покрывают gas и продление сделок.

## Контекст

| Параметр             | Значение                                  |
| -------------------- | ----------------------------------------- |
| Текущий каталог      | ~35 аниме, ~200 GB                        |
| Средний размер аниме | 3-6 GB                                    |
| Горячее хранение     | 2 Kubo пиннера (pinner1, pinner2)         |
| Формат контента      | HLS сегменты, манифесты, субтитры, шрифты |
| Рост                 | ~100 аниме к концу 2026, ~500 GB          |

## Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                    HOT LAYER (стриминг)                      │
│                                                             │
│  Pinner1 (mail) ◄──► Pinner2 (130.12.46.31 → VPS)          │
│  Kubo, FlatFS        Kubo, PebbleDS                         │
│                                                             │
│  Быстрый доступ для зрителей, HLS стриминг                  │
│  CID → Bitswap → зритель                                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
            ┌──────────────┴──────────────┐
            │ архивирование    восстановление
            ▼                             │
┌───────────────────────────────────────────────────────────────┐
│                   COLD LAYER (Filecoin)                       │
│                                                              │
│  Singularity (на pinner1 или отдельном сервере)              │
│  ├── Готовит CAR файлы из аниме-контента                     │
│  ├── Делает deals с 3-5 Storage Providers                    │
│  ├── Fil+ DataCap → бесплатное хранение                     │
│  └── Автоматическое продление сделок                         │
│                                                              │
│  Retrieval: IPFS Bitswap от SP (бесплатно)                  │
│  Fallback: HTTP retrieval от booster-http                    │
└───────────────────────────────────────────────────────────────┘
                           │
            ┌──────────────┴──────────────┐
            ▼                             ▼
┌──────────────────────┐    ┌──────────────────────────────────┐
│  Animatrona Tracker  │    │       Animatrona Desktop         │
│                      │    │                                  │
│  Статусы аниме:      │    │  Локальный Kubo может            │
│  🟢 LIVE (есть сиды)  │    │  восстановить аниме из           │
│  🟡 COLD (Filecoin)   │    │  Filecoin SP через Bitswap       │
│  ⚫ LOST (нет нигде)  │    │  и стать сидом                   │
└──────────────────────┘    └──────────────────────────────────┘
```

## Принцип работы

### Архивирование (наша сторона)

1. **Singularity** сканирует контент на пиннерах
2. Нарезает данные в CAR файлы (≤32 GiB каждый)
3. Несколько аниме по 3-6 GB упаковываются в один CAR
4. Для каждого CAR вычисляется CommP (Piece CID)
5. Singularity создаёт storage deals с 3-5 SP (бесплатно через Fil+ DataCap)
6. SP запечатывают данные в секторы
7. Трекер сохраняет маппинг: какой CID → в каком deal'е → у какого SP

### Восстановление (автоматическое)

```
Cron job на трекере (каждый час):
  1. Проверить heartbeat раздач → какие аниме без сидов?
  2. Пометить бессидовые как 🟡 COLD
  3. Когда пользователь запрашивает COLD аниме:
     a. Пиннер делает `ipfs pin add <CID>`
     b. Kubo находит блоки у Filecoin SP через Bitswap
     c. SP отдаёт данные бесплатно (они зарабатывают на block rewards)
     d. Данные появляются на пиннере → статус 🟢 LIVE
  4. Для пользователя — просто чуть дольше загрузка
```

### Восстановление через десктоп

Если пиннеры недоступны, пользователь может восстановить аниме сам:

1. Десктоп Animatrona видит статус 🟡 COLD
2. Локальный Kubo делает `pin add <CID>`
3. Kubo находит блоки у Filecoin SP (Bitswap)
4. Пользователь скачивает аниме → становится сидом
5. Десктоп отправляет heartbeat на трекер → статус 🟢 LIVE

## CAR файлы — как это работает

### Упаковка

CAR (Content Addressable aRchive) — архив блоков Merkle DAG с сохранением CID.

```
Исходные данные на пиннере:
  Наруто/          5.2 GB   CID: bafy...abc
  Бибоп/           2.1 GB   CID: bafy...def
  Евангелион/      3.8 GB   CID: bafy...ghi
  Алхимик/         4.1 GB   CID: bafy...jkl

         │ Singularity упаковывает
         ▼

  car-001.car (≤32 GiB):
    Наруто + Бибоп + Евангелион + Алхимик + ...
    Все оригинальные CID сохраняются внутри!

  car-002.car (≤32 GiB):
    Следующие аниме...
```

Singularity автоматически решает как распределить файлы по CAR'ам для оптимального заполнения секторов.

### Извлечение отдельного аниме

**Не нужно скачивать весь CAR!** SP умеют отдавать данные по payload CID:

- **IPFS Bitswap**: Kubo запрашивает конкретный CID → SP отдаёт нужные блоки
- **HTTP fallback**: `GET /ipfs/{contentCID}?format=car` → SP отдаёт только запрошенный DAG

Запрос CID `bafy...def` (Бибоп, 2.1 GB) вернёт только блоки Бибопа, а не весь CAR на 30 GB.

### Инкрементальные добавления

При появлении нового аниме в каталоге:

1. Singularity сканирует — видит новые файлы
2. Создаёт новый CAR только для новых данных
3. Делает deal с SP
4. Не трогает существующие deals

## Модели данных (schema.zmodel)

```zmodel
// Статус доступности аниме
enum AvailabilityStatus {
  LIVE    // есть активные сиды, доступно для просмотра
  COLD    // сиды ушли, данные в Filecoin, можно восстановить
  LOST    // нет ни сидов, ни Filecoin deals (не должно случаться)
}

// Расширение существующей модели Anime
model Anime {
  // ... существующие поля ...
  availability    AvailabilityStatus @default(LIVE)
  filecoinDeals   FilecoinDealContent[]
  revivals        Revival[]
}

// Маппинг CAR файлов к Filecoin deals
model FilecoinDeal {
  id          String   @id @default(cuid())
  pieceCid    String              // CommP — идентификатор CAR/piece
  carIndex    Int                 // порядковый номер CAR файла
  provider    String              // SP address: f01234
  dealId      BigInt              // on-chain deal ID
  startEpoch  Int                 // начало сделки (epoch)
  endEpoch    Int                 // конец сделки (epoch)
  expiry      DateTime            // когда истекает (человекочитаемо)
  sizeBytes   BigInt              // размер piece
  status      FilecoinDealStatus  @default(ACTIVE)
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt

  contents    FilecoinDealContent[]

  @@index([status])
  @@index([expiry])
}

enum FilecoinDealStatus {
  ACTIVE      // сделка действует
  EXPIRING    // истекает в ближайшие 30 дней
  EXPIRED     // истекла
  RENEWED     // продлена (новая сделка создана)
  FAILED      // ошибка
}

// Какие аниме в каком deal'е
model FilecoinDealContent {
  id          String   @id @default(cuid())
  deal        FilecoinDeal @relation(fields: [dealId], references: [id])
  dealId      String
  anime       Anime    @relation(fields: [animeId], references: [id])
  animeId     String
  rootCid     String              // IPFS CID корня аниме (bafy...)
  sizeBytes   BigInt

  @@unique([dealId, animeId])
}

// Лог восстановлений из холодного хранилища
model Revival {
  id            String   @id @default(cuid())
  anime         Anime    @relation(fields: [animeId], references: [id])
  animeId       String
  user          User?    @relation(fields: [userId], references: [id])
  userId        String?             // null = восстановлено автоматически трекером
  source        RevivalSource
  retrievalSec  Int                 // сколько секунд заняло
  sizeBytes     BigInt
  createdAt     DateTime @default(now())
}

enum RevivalSource {
  AUTO_PINNER   // автоматическое восстановление на пиннер
  USER_DESKTOP  // пользователь восстановил через десктоп
}
```

## Fil+ DataCap — получение бесплатного хранения

### Что такое DataCap

Storage Providers зарабатывают на block rewards (майнинг). Verified deal даёт SP 10x множитель наград. Поэтому SP **сами заинтересованы** хранить verified данные бесплатно.

DataCap — это квота на создание verified deals. Выдаётся бесплатно через Fil+ программу.

### Процесс подачи заявки

1. **Сайт:** https://fil.org/filecoin-plus (бывш. filplus.storage)
2. **Описание проекта:** Open-source платформа для хранения и стриминга аниме-контента через IPFS. Filecoin используется как cold storage для долговременного сохранения каталога.
3. **Объём:** Начальная заявка на 1 TiB, затем увеличение по мере роста
4. **Требования:**
   - Легитимный контент (не пиратский)
   - Описание стратегии распределения по SP (3-5 провайдеров, 2-3 региона)
   - KYC верификация
5. **Срок одобрения:** 1-4 недели
6. **Рост:** После успешного использования первого транша можно запросить больше

### План роста DataCap

| Период  | Каталог    | Объём   | DataCap запрос        |
| ------- | ---------- | ------- | --------------------- |
| Q1 2026 | 35 аниме   | ~200 GB | 1 TiB (первая заявка) |
| Q3 2026 | ~70 аниме  | ~500 GB | 2 TiB                 |
| Q1 2027 | ~150 аниме | ~1.2 TB | 5 TiB                 |
| Q3 2027 | ~300 аниме | ~3 TB   | 10 TiB                |

## Singularity — инструмент управления

### Что это

Go-приложение для подготовки данных и автоматического deal-making с Filecoin SP. Версия v2 (v0.6.0+).

### Размещение

На pinner1 (mail сервер) или отдельным контейнером. Требования невысокие:

- RAM: минимальные (Go, не Node.js)
- Диск: место для CAR файлов (можно inline preparation — без хранения CAR)
- БД: SQLite (для нашего масштаба) или PostgreSQL

### Рабочий процесс

```bash
# 1. Установка
go install github.com/data-preservation-programs/singularity@latest

# 2. Инициализация
singularity init

# 3. Добавление датасета (указываем путь к данным на пиннере)
singularity dataset create anime-catalog
singularity datasource add local anime-catalog /path/to/ipfs/data

# 4. Подготовка CAR файлов
singularity run dataset-worker

# 5. Добавление кошелька с DataCap
singularity wallet import /path/to/wallet.key

# 6. Добавление Storage Providers
singularity replication add-schedule anime-catalog \
  --provider f01234 \
  --provider f05678 \
  --provider f09012

# 7. Запуск репликации
singularity run deal-maker
```

### Inline Preparation

Singularity может генерировать CAR на лету при отправке SP, не сохраняя CAR файлы на диск. Экономит место — критично для наших серверов с ограниченным диском.

## Выбор Storage Providers

### Критерии

1. **Поддержка Bitswap retrieval** — SP запускает Kubo рядом с Boost, данные доступны через IPFS
2. **HTTP retrieval (fallback)** — booster-http эндпоинт `/ipfs/{CID}`
3. **Verified deals** — принимает Fil+ DataCap
4. **Надёжность** — высокий uptime, хорошая репутация на filrep.io
5. **География** — 2-3 региона для отказоустойчивости

### Инструменты поиска

- **filrep.io** — репутация, retrieval score, цены
- **Fil+ allocator dashboard** — https://filplus.fil.org/
- Прямая проверка: `GET /info` у SP для подтверждения booster-http

### Стратегия репликации

- **3 реплики** минимум (разные SP, разные регионы)
- **5 реплик** для популярного контента
- Приоритет: Европа (близость к аудитории) + Азия + Северная Америка

## Retrieval — почему IPFS Bitswap, а не HTTP

| Критерий       | IPFS Bitswap                        | HTTP Retrieval              |
| -------------- | ----------------------------------- | --------------------------- |
| Инфраструктура | Уже есть (Kubo пиннеры)             | Нужен HTTP клиент           |
| Интеграция     | `ipfs pin add <CID>` — одна команда | Скачать CAR → импортировать |
| Верификация    | Встроенная (content-addressing)     | Нужна ручная проверка       |
| Десктоп клиент | Kubo уже встроен                    | Нужен отдельный модуль      |
| Скорость       | Сопоставима                         | Сопоставима                 |
| Доступность SP | Большинство с Boost                 | Большинство с Boost         |

**HTTP retrieval** остаётся как fallback на случай, если Bitswap не работает у конкретного SP.

## Восстановление — детали

### Автоматическое (трекер)

```
API: POST /api/admin/revive/[animeId]

1. Проверить: есть ли FilecoinDeal для этого аниме?
   Нет → статус LOST, ничего не делаем
   Да → продолжаем

2. Выбрать SP с активным deal'ом

3. На пиннере выполнить:
   curl -X POST "http://pinner:5011/api/v0/pin/add?arg=<CID>"

   Kubo найдёт блоки у SP через Bitswap/IPNI

4. Дождаться завершения пиннинга (polling)

5. Обновить статус аниме: COLD → LIVE

6. Записать Revival лог
```

### Через десктоп (пользователь)

```
1. Десктоп видит статус COLD на трекере
2. UI: "Это аниме в холодном хранилище. Восстановить? (~5-30 мин)"
3. Пользователь подтверждает
4. Локальный Kubo: ipfs pin add <CID>
5. Kubo находит блоки у Filecoin SP
6. Скачивает → пользователь становится сидом
7. Десктоп отправляет heartbeat → трекер обновляет статус
```

### Оценка времени восстановления

| Сценарий                          | Время                                      |
| --------------------------------- | ------------------------------------------ |
| SP online, данные в кэше          | 1-5 мин (5 GB)                             |
| SP online, нужен unseal           | 15-60 мин                                  |
| SP offline, fallback на другой SP | +1-2 мин на обнаружение                    |
| Все SP offline                    | LOST (не должно случаться при 3+ репликах) |

## Донаты в FIL

### Назначение

Покрытие расходов на gas (deal creation, renewal) и поддержку инфраструктуры.

### Реализация

- **Кошелёк:** FEVM-совместимый адрес (0x / f410) — работает с MetaMask
- **На сайте трекера:** страница с адресом + QR-код
- **Прозрачность:** публичный адрес, любой может проверить баланс на filfox.info

### Расходы

| Статья                           | Стоимость            |
| -------------------------------- | -------------------- |
| Gas за storage deals (200 GB)    | ~0.5-2 FIL разово    |
| Gas за renewal (каждые 540 дней) | ~0.5-2 FIL           |
| Retrieval                        | Бесплатно            |
| **Итого в год**                  | **~1-4 FIL ($3-12)** |

При росте каталога расходы растут линейно, но остаются минимальными.

## Геймификация

### Статус на странице аниме

```
🟢 Доступно — 3 сида, смотрите сейчас
🟡 В архиве — нет сидов, восстановление ~5-30 мин  [Восстановить]
⚫ Утеряно — данные недоступны (не должно случаться)
```

### Достижения пользователей

| Ранг       | Условие      | Описание                    |
| ---------- | ------------ | --------------------------- |
| Спасатель  | 1 revival    | Восстановил аниме из архива |
| Хранитель  | 3 revivals   | Регулярно оживляет контент  |
| Архивариус | 10 revivals  | Хранитель архива            |
| Легенда    | 25+ revivals | Легенда сообщества          |

Revival записывается в модель Revival и отображается в профиле пользователя.

## Мониторинг

### Дашборд в админке (новый таб)

- Список всех FilecoinDeal'ов с статусами
- Уведомление об истекающих deals (за 30 дней)
- Количество LIVE / COLD / LOST аниме
- История Revival'ов
- Баланс FIL кошелька

### Cron jobs

| Job         | Интервал   | Действие                                 |
| ----------- | ---------- | ---------------------------------------- |
| Check seeds | 1 час      | Обновить availability статус аниме       |
| Check deals | 1 день     | Обновить статус deals, пометить EXPIRING |
| Auto-revive | По запросу | Восстановить COLD аниме при обращении    |
| Renew deals | 1 неделя   | Продлить EXPIRING deals                  |

## Фазы реализации

### Фаза 1: Архивирование (2-3 дня)

1. Установить Singularity на pinner1
2. Подать заявку на Fil+ DataCap
3. Подготовить CAR файлы для текущего каталога
4. Сделать deals с 3 SP
5. Добавить модели FilecoinDeal, FilecoinDealContent в schema.zmodel
6. Сохранить маппинг CID → deal в БД трекера

### Фаза 2: Мониторинг (1-2 дня)

1. Таб "Filecoin" в админке — список deals, статусы, expiry
2. Cron job проверки deals (статусы, expiring)
3. Страница донатов с FIL адресом

### Фаза 3: Автоматическое восстановление (2-3 дня)

1. Поле `availability` в модели Anime
2. Cron job проверки сидов → обновление статуса
3. API `POST /api/admin/revive/[animeId]`
4. Автоматический revive при запросе COLD аниме
5. Модель Revival, лог восстановлений

### Фаза 4: Десктоп интеграция (3-5 дней)

1. UI статуса COLD на странице аниме в десктопе
2. Кнопка "Восстановить" → `ipfs pin add`
3. Прогресс-бар восстановления
4. Отправка heartbeat на трекер после восстановления

### Фаза 5: UX и геймификация (1-2 дня)

1. Бейджи 🟢/🟡/⚫ на карточках в каталоге
2. Достижения за revival в профиле
3. Счётчик "оживлений" на странице аниме

## Зависимости

| Компонент          | Зависит от                         |
| ------------------ | ---------------------------------- |
| Singularity        | pinner1 (или отдельный сервер)     |
| DataCap            | Заявка Fil+ (1-4 недели ожидания)  |
| Модели БД          | schema.zmodel (animatrona-tracker) |
| Автовосстановление | Pin-Queue API на пиннерах          |
| Десктоп интеграция | animatrona (Electron)              |

## Риски

| Риск                                | Вероятность | Митигация                          |
| ----------------------------------- | ----------- | ---------------------------------- |
| DataCap не одобрят                  | Низкая      | Повторная заявка, другой allocator |
| SP уходит offline                   | Средняя     | 3-5 реплик у разных SP             |
| Контент слишком большой для DataCap | Низкая      | Итеративные заявки                 |
| Lassie/retrieval не работает        | Низкая      | HTTP retrieval как fallback        |
| Deal истекает незамеченным          | Средняя     | Cron мониторинг + уведомления      |

## Ссылки

- [Singularity](https://github.com/data-preservation-programs/singularity)
- [Fil+ DataCap](https://fil.org/filecoin-plus)
- [Boost HTTP Retrieval](https://boost.filecoin.io/retrieving-data-from-filecoin/http-retrieval)
- [FilRep.io](https://filrep.io) — репутация Storage Providers
- [Filfox.info](https://filfox.info) — Filecoin explorer
- [RaaS Starter Kit](https://github.com/filecoin-project/raas-starter-kit)
- [Filecoin Docs](https://docs.filecoin.io)

---

**Создано:** 2026-03-19
