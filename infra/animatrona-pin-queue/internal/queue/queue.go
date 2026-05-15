// Worker-очередь для последовательного пиннинга CID через Kubo.
package queue

import (
	"log"
	"sync"
	"time"

	"animatrona-pin-queue/internal/kubo"
	"animatrona-pin-queue/internal/state"
)

// Максимум повторных попыток при ошибке пиннинга
const maxRetries = 3

// Backoff между попытками: 30с, 60с, 120с
var retryBackoffs = []time.Duration{30 * time.Second, 60 * time.Second, 120 * time.Second}

// Максимум переподключений стрима pin/add для одного CID.
// Kubo может обрывать долгий pin/add стрим (server-side timeout), но блоки
// остаются в datastore — новый pin/add продолжит с того же места.
const maxStreamReconnects = 50

// Пауза между переподключениями стрима
const streamReconnectDelay = 5 * time.Second

// Worker обрабатывает очередь пиннинга
type Worker struct {
	store            *state.Store
	kubo             *kubo.Client
	providerPeers    []string
	wakeup           chan struct{}
	mu               sync.Mutex
	running          bool
	progressDebounce time.Duration
}

// New создаёт worker для обработки очереди.
// providerPeers — multiaddr'а провайдеров контента для swarm connect перед пиннингом.
func New(store *state.Store, kuboClient *kubo.Client, providerPeers []string) *Worker {
	return &Worker{
		store:            store,
		kubo:             kuboClient,
		providerPeers:    providerPeers,
		wakeup:           make(chan struct{}, 1),
		progressDebounce: 5 * time.Second,
	}
}

// Start запускает worker в горутине
func (w *Worker) Start() {
	go w.loop()

	// Периодическая очистка завершённых записей (каждый час)
	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			if cleaned := w.store.Cleanup(); cleaned > 0 {
				log.Printf("Очистка: удалено %d завершённых записей", cleaned)
			}
		}
	}()
}

// Notify будит worker для проверки очереди
func (w *Worker) Notify() {
	select {
	case w.wakeup <- struct{}{}:
	default: // Уже разбужен
	}
}

func (w *Worker) loop() {
	for {
		w.processNext()

		// Ждём пробуждения или таймаут
		select {
		case <-w.wakeup:
		case <-time.After(30 * time.Second):
			// Периодическая проверка на случай пропущенного wakeup
		}
	}
}

func (w *Worker) processNext() {
	// Не обрабатываем если уже пиннинг идёт
	if w.store.HasPinning() {
		return
	}

	entry := w.store.NextQueued()
	if entry == nil {
		return
	}

	retryLabel := ""
	if entry.RetryCount > 0 {
		retryLabel = log.Prefix() // пустой, просто для формата
		_ = retryLabel
		log.Printf("Начинаю пиннинг (попытка %d/%d): %s (id: %s)", entry.RetryCount+1, maxRetries+1, entry.CID, entry.ExternalID)
	} else {
		log.Printf("Начинаю пиннинг: %s (id: %s)", entry.CID, entry.ExternalID)
	}

	// Подключаемся к провайдерам контента перед пиннингом (если настроены)
	for _, peer := range w.providerPeers {
		if peer == "" {
			continue
		}
		if err := w.kubo.SwarmConnect(peer); err != nil {
			log.Printf("Swarm connect к %s: %s (продолжаем)", peer, err)
		} else {
			log.Printf("Swarm connect к %s: OK", peer)
		}
	}

	// Debounce для обновления прогресса в state
	var lastSave time.Time
	progressCallback := func(progress int) {
		now := time.Now()
		if now.Sub(lastSave) >= w.progressDebounce {
			w.store.UpdateProgress(entry.CID, progress)
			lastSave = now
		}
	}

	// Резилиентный pin/add: при обрыве стрима переподключаемся до maxStreamReconnects раз.
	// Блоки уже в datastore Kubo — новый pin/add продолжит с того же места.
	var lastErr error
	var totalBlocks int
	success := false

	for attempt := 0; attempt < maxStreamReconnects; attempt++ {
		blocks, err := w.kubo.PinAddWithProgress(entry.CID, progressCallback)
		if err == nil {
			// Финальное событие получено — pin подтверждён
			totalBlocks = blocks
			success = true
			break
		}

		lastErr = err
		if blocks > totalBlocks {
			totalBlocks = blocks
		}

		// Проверяем — может уже запинен через параллельную операцию?
		pinned, checkErr := w.kubo.PinLs(entry.CID)
		if checkErr == nil && pinned {
			log.Printf("CID %s запинён (подтверждено pin/ls)", entry.CID)
			success = true
			break
		}

		log.Printf("Стрим обрыв для %s (попытка %d/%d): %s — переподключаюсь", entry.CID, attempt+1, maxStreamReconnects, err)
		time.Sleep(streamReconnectDelay)
	}

	if success {
		log.Printf("Успешно запинён: %s (%d блоков)", entry.CID, totalBlocks)
		w.store.MarkPinned(entry.CID, totalBlocks)
		return
	}

	// Все переподключения провалились — переходим на retry через backoff очередь
	log.Printf("Исчерпаны переподключения стрима для %s: %s", entry.CID, lastErr)

	if w.store.RequeueForRetry(entry.CID, maxRetries) {
		backoff := retryBackoffs[0]
		if entry.RetryCount < len(retryBackoffs) {
			backoff = retryBackoffs[entry.RetryCount]
		}
		log.Printf("Retry %s через %s (попытка %d/%d)", entry.CID, backoff, entry.RetryCount+1, maxRetries)
		time.Sleep(backoff)
		return
	}

	// Лимит попыток исчерпан
	log.Printf("Превышен лимит попыток для %s (%d/%d), помечаю как FAILED", entry.CID, maxRetries, maxRetries)
	errMsg := "стрим закрылся без подтверждения пиннинга"
	if lastErr != nil {
		errMsg = lastErr.Error()
	}
	w.store.MarkFailed(entry.CID, errMsg)
}
