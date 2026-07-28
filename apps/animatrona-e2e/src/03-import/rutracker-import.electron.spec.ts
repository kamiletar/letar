/**
 * Import тесты: Импорт аниме из Рутрекера (`ImportRutrackerContent`)
 *
 * Проверяют:
 * - Навигация на вкладку "Rutracker" страницы "Импорт" открывается
 * - Кнопка "Парсить и найти на Shikimori" disabled без ввода URL/HTML
 * - Импорт при недоступном Shikimori API доходит до детерминированного
 *   шага "error" (Shikimori-запросы уходят из MAIN-процесса через net.fetch —
 *   см. комментарий у SHIKIMORI_BLOCK_PATTERNS ниже)
 *
 * ⚠️ Happy-path (успешный матч → шаг "preview") НЕ покрыт этим файлом.
 * Смотри комментарий в конце файла — почему и что нужно для этого доделать.
 */

import { expect, test } from '@playwright/test'
import {
  checkProductionBuild,
  closeElectronApp,
  type ElectronTestContext,
  launchElectronApp,
  waitForMainWindow,
} from '../../helpers/electron.helpers'
import { RutrackerImportPage } from '../../pages/rutracker-import.page'

/**
 * HTML-фикстура раздачи БЕЗ ссылок на Shikimori/MAL.
 *
 * Структура скопирована с `apps/animatrona/main/services/rutracker/__tests__/fixtures/ergo-proxy-minimal.html`
 * (используется в unit-тестах парсера), но:
 * - убраны ссылки `postLink p-ext-link` на shikimori.one/myanimelist.net —
 *   `matchFromDirectLink`/`matchFromMalLink` в `rutracker-matcher.ts` вернут null,
 *   и `processRutrackerImport` пойдёт в ветку поиска по названию (`searchAnime`);
 * - заголовок содержит ТОЛЬКО русское название (без " / Original") — тогда
 *   `torrent.nameOriginal === torrent.nameRu`, и в `rutracker-import.ts`
 *   `searchQueries` будет содержать ровно ОДИН запрос вместо двух — это делает
 *   тест быстрее и предсказуемее (при заблокированной сети каждый запрос
 *   к Shikimori — это 2 попытки с ретраем через 3с, см. `SHIKIMORI_MIN_INTERVAL`
 *   и `MAX_ATTEMPTS` в `client.ts`/`throttle.ts`).
 */
const RUTRACKER_HTML_NO_EXTERNAL_LINKS = `<!doctype html>
<html>
  <head>
    <title>RuTracker :: Невероятное Тестовое Аниме</title>
  </head>
  <body>
    <h1 class="maintitle">
      <a id="topic-title" class="topic-title-1112233" href="https://rutracker.org/forum/viewtopic.php?t=1112233">
        Невероятное Тестовое Аниме [TV] [12 из 12] [RUS] [2020, комедия, WEB-DL] [720p]
      </a>
    </h1>

    <div class="post_body" id="p-11223344" data-ext_link_data='{"p":11223344,"t":1112233,"f":33,"u":100200}'>
      <span class="post-b">Страна</span>: Япония<br />
      <span class="post-b">Жанр</span>: комедия<br />
      <span class="post-b">Год</span>: 2020<br />
      <span class="post-b">Описание</span>: Тестовая раздача для e2e без внешних ссылок на Shikimori/MAL.<br />
    </div>

    <fieldset class="attach">
      <legend>Download</legend>
      <div class="attach_link guest">
        <ul class="inlined middot-separated">
          <li>
            <a
              href="magnet:?xt=urn:btih:AABBCCDDEEFF00112233445566778899AABBCCDD&tr=http%3A%2F%2Fbt3.t-ru.org%2Fann%3Fmagnet&dn=Test+Anime"
              class="magnet-link"
              data-topic_id="1112233"
            >
              Скачать по magnet-ссылке
            </a>
          </li>
          <li>· 1.2 GB</li>
        </ul>
      </div>
    </fieldset>
  </body>
</html>
`

/**
 * Хосты Shikimori, к которым приложение обращается ИЗ MAIN-процесса через `net.fetch`
 * (GraphQL `shikimori.io/api/graphql` в `client.ts` + REST `shikimori.one/api/*` в `anime-api.ts`).
 *
 * `page.route()` (см. `apps/animatrona-e2e/helpers/shikimori.mock.ts`) перехватывает только
 * сетевой стек рендерера (Chromium page context) — main-процесс Electron идёт мимо него.
 * Единственный доступный без изменения кода приложения seam — `session.webRequest` в main,
 * который включаем через `app.evaluate()` (см. `blockShikimoriNetwork` ниже).
 */
const SHIKIMORI_URL_PATTERNS = ['*://shikimori.io/*', '*://shikimori.one/*']

/**
 * Обрывает ВСЕ сетевые запросы к shikimori.io/shikimori.one на уровне Electron session
 * дефолтного `session.defaultSession` в main-процессе.
 *
 * Это единственный сетевой seam, доступный без dedicated test-mode hook в main-процессе
 * (такого хука сейчас нет — см. комментарий в конце файла). `webRequest.onBeforeRequest`
 * может только ОТМЕНИТЬ/перенаправить запрос, но не подменить тело ответа — поэтому
 * этим способом можно детерминированно протестировать только ветку ОШИБКИ сети,
 * а не happy-path с успешным Shikimori-матчем.
 */
async function blockShikimoriNetwork(ctx: ElectronTestContext): Promise<void> {
  await ctx.app.evaluate(({ session }, patterns) => {
    session.defaultSession.webRequest.onBeforeRequest({ urls: patterns }, (_details, callback) => {
      callback({ cancel: true })
    })
  }, SHIKIMORI_URL_PATTERNS)
}

let ctx: ElectronTestContext

test.describe('Импорт из Rutracker', () => {
  test.beforeAll(() => {
    if (!checkProductionBuild()) {
      test.skip()
      console.log('Skipping Electron tests: production build not found')
    }
  })

  test.beforeEach(async () => {
    ctx = await launchElectronApp()
    await waitForMainWindow(ctx, 60000)
  })

  test.afterEach(async () => {
    await closeElectronApp(ctx)
  })

  test('вкладка "Rutracker" страницы "Импорт" открывается через навигацию', async () => {
    const rutrackerPage = new RutrackerImportPage(ctx.page)
    await rutrackerPage.goto()

    await expect(rutrackerPage.htmlTextarea).toBeVisible()
    await expect(rutrackerPage.urlInput).toBeVisible()
    await expect(rutrackerPage.parseButton).toBeVisible()
  })

  test('кнопка "Парсить и найти на Shikimori" disabled без URL и HTML', async () => {
    const rutrackerPage = new RutrackerImportPage(ctx.page)
    await rutrackerPage.goto()

    // Пустой ввод — кнопка disabled (см. `disabled={!htmlInput.trim() && !urlInput.trim()}` в page.tsx)
    expect(await rutrackerPage.isParseEnabled()).toBe(false)

    // Вставили HTML — кнопка активна
    await rutrackerPage.fillHtml(RUTRACKER_HTML_NO_EXTERNAL_LINKS)
    expect(await rutrackerPage.isParseEnabled()).toBe(true)
  })

  test('импорт при недоступном Shikimori приводит к экрану ошибки', async () => {
    // Обрываем сеть к Shikimori ДО клика "Парсить" — main-процесс будет получать
    // сетевые ошибки на все запросы searchAnime/getAnimeExtended
    await blockShikimoriNetwork(ctx)

    const rutrackerPage = new RutrackerImportPage(ctx.page)
    await rutrackerPage.goto()

    await rutrackerPage.fillHtml(RUTRACKER_HTML_NO_EXTERNAL_LINKS)
    await rutrackerPage.clickParse()

    // Шаг "loading" — виден спиннер парсинга/поиска
    await expect(rutrackerPage.loadingSpinner).toBeVisible({ timeout: 5000 })

    // Ветка без прямых ссылок на Shikimori/MAL уходит в searchAnime() → executeQuery(),
    // который при заблокированной сети ретраит 2 попытки с паузой 3с (см. client.ts MAX_ATTEMPTS)
    // и затем бросает ошибку — IPC handler (createHandler) ловит throw и возвращает
    // { success: false, error }, page.tsx переводит шаг в "error" (НЕ ловится и не превращается
    // в needsConfirmation/candidates: [] — только сетевые сбои внутри searchAnime приводят к throw)
    await expect(rutrackerPage.errorText).toBeVisible({ timeout: 30000 })
    await expect(rutrackerPage.retryButton).toBeVisible()

    // Кнопка "Попробовать снова" возвращает на шаг ввода
    await rutrackerPage.retryButton.click()
    await expect(rutrackerPage.htmlTextarea).toBeVisible({ timeout: 5000 })
  })
})

/**
 * HTML-фикстура раздачи С прямой ссылкой на Shikimori (Steins;Gate, id=9253).
 *
 * `matchFromDirectLink` в `rutracker-matcher.ts` сработает сразу по
 * `externalLinks.shikimoriId` — `rutracker-import.ts` уходит по ветке
 * "прямой матч" и делает РОВНО ОДИН реальный запрос `getAnimeExtended(9253)`
 * (GraphQL POST на shikimori.io + REST-запрос ролей), минуя searchAnime().
 */
const RUTRACKER_HTML_DIRECT_SHIKIMORI_LINK = `<!doctype html>
<html>
  <head>
    <title>RuTracker :: Врата Штейна</title>
  </head>
  <body>
    <h1 class="maintitle">
      <a id="topic-title" class="topic-title-9999999" href="https://rutracker.org/forum/viewtopic.php?t=9999999">
        Врата Штейна / Steins;Gate [TV] [24 из 24] [RUS(ext), JAP+Sub] [2011, научная фантастика, триллер, BDRip] [1080p]
      </a>
    </h1>

    <div class="post_body" id="p-99998888" data-ext_link_data='{"p":99998888,"t":9999999,"f":33,"u":100200}'>
      <span class="post-b">Страна</span>: Япония<br />
      <span class="post-b">Студия</span>: White Fox<br />
      <span class="post-b">Год</span>: 2011<br />
      <span class="post-b">Описание</span>: E2E-фикстура с реальной ссылкой на Shikimori.<br />
      Shikimori: <a class="postLink" href="https://shikimori.one/animes/z9253-steins-gate">shikimori.one/animes/9253</a><br />
    </div>

    <fieldset class="attach">
      <legend>Download</legend>
      <div class="attach_link guest">
        <ul class="inlined middot-separated">
          <li>
            <a
              href="magnet:?xt=urn:btih:00112233445566778899AABBCCDDEEFF00112233&tr=http%3A%2F%2Fbt3.t-ru.org%2Fann%3Fmagnet&dn=Steins+Gate"
              class="magnet-link"
              data-topic_id="9999999"
            >
              Скачать по magnet-ссылке
            </a>
          </li>
          <li>· 8.4 GB</li>
        </ul>
      </div>
    </fieldset>
  </body>
</html>
`

test.describe('Импорт из Rutracker — реальная сеть (без мока Shikimori)', () => {
  test.beforeAll(() => {
    if (!checkProductionBuild()) {
      test.skip()
      console.log('Skipping Electron tests: production build not found')
    }
  })

  test.beforeEach(async () => {
    ctx = await launchElectronApp()
    await waitForMainWindow(ctx, 60000)
  })

  test.afterEach(async () => {
    await closeElectronApp(ctx)
  })

  /**
   * ⚠️ Единственный тест в сьюте, который реально ходит в интернет на
   * shikimori.io/shikimori.one. Не гейтуется в CI/staging (нет `blockShikimoriNetwork`) —
   * специально написан для локальной диагностики бага "падало на POST-запросе к
   * ShikimoriGraphQL" (см. throttle/retry/endpoint-фоллбэк логику в client.ts).
   *
   * Таймаут увеличен: throttle 3с + до 2 попыток по 30с на GraphQL + REST-запрос ролей.
   */
  test('прямой матч по реальной ссылке на Shikimori (id=9253) доходит до preview', async () => {
    const rutrackerPage = new RutrackerImportPage(ctx.page)
    await rutrackerPage.goto()

    await rutrackerPage.fillHtml(RUTRACKER_HTML_DIRECT_SHIKIMORI_LINK)
    await rutrackerPage.clickParse()

    // Не проверяем loadingSpinner отдельным expect() — прямой матч (без searchAnime)
    // может уложиться в реальный запрос быстрее, чем следующий poll успевает его застать,
    // так что шаг "loading" рискует промелькнуть и не попасть в 5-секундное окно.

    // Ждём либо preview (успех), либо error (если POST к ShikimoriGraphQL падает —
    // именно это и нужно продиагностировать)
    await Promise.race([
      rutrackerPage.downloadButton.waitFor({ state: 'visible', timeout: 60_000 }),
      rutrackerPage.errorText.waitFor({ state: 'visible', timeout: 60_000 }),
    ])

    const hasError = await rutrackerPage.errorText.isVisible().catch(() => false)
    if (hasError) {
      const errorMessage = await ctx.page.getByText(/попробовать снова/i).locator('..').textContent()
      throw new Error(`Импорт с реальным Shikimori упал на этапе ошибки. Текст на экране: ${errorMessage}`)
    }

    await expect(ctx.page.getByText('Steins;Gate', { exact: false })).toBeVisible()
    await expect(rutrackerPage.downloadButton).toBeEnabled()
  })
})

/**
 * ⚠️ Happy-path (успешный Shikimori-матч → шаг "preview" с названием и активной
 * кнопкой "Скачать и импортировать") этим файлом НЕ покрыт.
 *
 * Почему: `session.webRequest.onBeforeRequest` умеет только cancel/redirect запроса,
 * а не подмену тела ответа. Чтобы вернуть success-ответ GraphQL/REST без реального
 * похода на shikimori.io/shikimori.one, нужен один из:
 *
 * 1. Dedicated test-mode hook в main-процессе (например, переменная окружения
 *    `ANIMATRONA_E2E_MOCK_SHIKIMORI=1`, читаемая в `main/services/shikimori/client.ts`/
 *    `anime-api.ts`, которая подменяет `executeQuery`/`getAnimeRestData` на функцию,
 *    возвращающую фикстуру из JSON-файла) — самый надёжный вариант, но требует
 *    правки прод-кода main-процесса specifically под тесты.
 * 2. `protocol.interceptStreamProtocol`/`interceptHttpProtocol` на `session.defaultSession`
 *    для http/https — теоретически может подменить тело ответа, но требует
 *    экспериментальной проверки, что это не конфликтует с уже зарегистрированными
 *    протокол-хендлерами Electron/Next.js static export в этом приложении.
 *
 * Оба варианта — отдельная задача, не входящая в объём этого файла (см. отчёт агента).
 */
