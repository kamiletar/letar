// Клиент для Kubo RPC API с поддержкой NDJSON стрима прогресса.
package kubo

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

// idleTimeout — максимальное время без прогресс-событий.
// Если Kubo молчит дольше этого — считаем что завис (I/O stall, deadlock и т.д.)
// и отменяем запрос, позволяя queue.go переподключиться.
const idleTimeout = 5 * time.Minute

// Client — HTTP-клиент для Kubo RPC API
type Client struct {
	apiURL    string
	authToken string
	client    *http.Client
}

// PinProgress — строка NDJSON из pin/add?progress=true
type PinProgress struct {
	Pins     []string `json:"Pins"`
	Progress int      `json:"Progress"`
}

// ProgressCallback вызывается при каждом обновлении прогресса.
// blocks — количество загруженных блоков.
type ProgressCallback func(blocks int)

// New создаёт Kubo клиент
func New(apiURL, authToken string) *Client {
	return &Client{
		apiURL:    apiURL,
		authToken: authToken,
		client: &http.Client{
			// Без глобального таймаута — pin/add может длиться часами
			Timeout: 0,
		},
	}
}

// scanResult — результат одной итерации чтения NDJSON стрима.
type scanResult struct {
	line   []byte // nil если isDone
	isDone bool
	err    error
}

// PinAddWithProgress запускает пиннинг CID и стримит прогресс через callback.
// Блокирует до завершения пиннинга или ошибки.
// Возвращает итоговое количество блоков при успехе.
//
// Защита от зависания: scanner работает в горутине, main использует select
// с idle timer. Когда timer срабатывает — отменяем контекст и закрываем body,
// что гарантированно разблокирует горутину. Queue.go затем переподключится.
func (c *Client) PinAddWithProgress(cid string, cb ProgressCallback) (int, error) {
	reqURL := fmt.Sprintf("%s/api/v0/pin/add?arg=%s&progress=true",
		c.apiURL, url.QueryEscape(cid))

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "POST", reqURL, nil)
	if err != nil {
		return 0, fmt.Errorf("создание запроса: %w", err)
	}

	if c.authToken != "" {
		req.Header.Set("Authorization", "Bearer "+c.authToken)
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return 0, fmt.Errorf("запрос к Kubo: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return 0, fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body))
	}

	// Scanner работает в горутине — это позволяет main-горутине использовать select
	// с idle timer, не блокируясь в scanner.Scan().
	results := make(chan scanResult)

	go func() {
		scanner := bufio.NewScanner(resp.Body)
		scanner.Buffer(make([]byte, 0, 64*1024), 256*1024)

		for scanner.Scan() {
			b := make([]byte, len(scanner.Bytes()))
			copy(b, scanner.Bytes())
			select {
			case results <- scanResult{line: b}:
			case <-ctx.Done():
				return
			}
		}
		// Стрим завершён (успешно или ошибка) — отправляем финальный результат.
		select {
		case results <- scanResult{isDone: true, err: scanner.Err()}:
		case <-ctx.Done():
		}
	}()

	// Idle timer: если нет прогресса дольше idleTimeout — Kubo завис.
	// При срабатывании: cancel() + resp.Body.Close() → goroutine разблокируется.
	idleTimer := time.NewTimer(idleTimeout)
	defer idleTimer.Stop()

	lastBlocks := 0

	for {
		select {
		case r := <-results:
			if r.isDone {
				if r.err != nil {
					return lastBlocks, fmt.Errorf("чтение стрима: %w", r.err)
				}
				// Стрим закрылся без финального Pins — возможно Kubo рестарт
				return lastBlocks, fmt.Errorf("стрим закрылся без подтверждения пиннинга")
			}

			if len(r.line) == 0 {
				continue
			}

			var progress PinProgress
			if err := json.Unmarshal(r.line, &progress); err != nil {
				continue // пропускаем невалидные строки
			}

			if progress.Pins != nil && len(progress.Pins) > 0 {
				// Пиннинг завершён успешно
				if cb != nil {
					cb(lastBlocks)
				}
				return lastBlocks, nil
			}

			if progress.Progress > 0 {
				// Всегда обновляем callback (для state.json)
				if cb != nil {
					cb(progress.Progress)
				}
				// Idle timer сбрасываем ТОЛЬКО при реальном росте блоков.
				// Если Kubo повторяет одно значение (напр. 5 блоков из кеша) —
				// таймер не сбрасывается и через 5 мин будет reconnect.
				if progress.Progress > lastBlocks {
					lastBlocks = progress.Progress
					if !idleTimer.Stop() {
						select {
						case <-idleTimer.C:
						default:
						}
					}
					idleTimer.Reset(idleTimeout)
				}
			}

		case <-idleTimer.C:
			// Нет прогресса дольше idleTimeout — Kubo завис
			cancel()        // сигнал горутине через ctx.Done()
			resp.Body.Close() // разблокировать scanner.Scan() в горутине
			return lastBlocks, fmt.Errorf("idle timeout: нет прогресса %s", idleTimeout)
		}
	}
}

// PinRm удаляет CID из пиннинга
func (c *Client) PinRm(cid string) error {
	reqURL := fmt.Sprintf("%s/api/v0/pin/rm?arg=%s",
		c.apiURL, url.QueryEscape(cid))

	req, err := http.NewRequest("POST", reqURL, nil)
	if err != nil {
		return fmt.Errorf("создание запроса: %w", err)
	}

	if c.authToken != "" {
		req.Header.Set("Authorization", "Bearer "+c.authToken)
	}

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("запрос к Kubo: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		text := string(body)
		// "not pinned" — не ошибка
		if contains(text, "not pinned") {
			return nil
		}
		return fmt.Errorf("HTTP %d: %s", resp.StatusCode, text)
	}

	return nil
}

// PinLs проверяет, запинён ли CID
func (c *Client) PinLs(cid string) (bool, error) {
	reqURL := fmt.Sprintf("%s/api/v0/pin/ls?arg=%s&type=all",
		c.apiURL, url.QueryEscape(cid))

	req, err := http.NewRequest("POST", reqURL, nil)
	if err != nil {
		return false, err
	}

	if c.authToken != "" {
		req.Header.Set("Authorization", "Bearer "+c.authToken)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return false, nil
	}

	var result struct {
		Keys map[string]struct {
			Type string `json:"Type"`
		} `json:"Keys"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return false, err
	}

	_, ok := result.Keys[cid]
	return ok, nil
}

// SwarmConnect подключает Kubo к указанному peer multiaddr.
// Используется перед pin/add для обеспечения связности с провайдером контента.
func (c *Client) SwarmConnect(multiaddr string) error {
	reqURL := fmt.Sprintf("%s/api/v0/swarm/connect?arg=%s",
		c.apiURL, url.QueryEscape(multiaddr))

	req, err := http.NewRequest("POST", reqURL, nil)
	if err != nil {
		return fmt.Errorf("создание запроса: %w", err)
	}

	if c.authToken != "" {
		req.Header.Set("Authorization", "Bearer "+c.authToken)
	}

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("swarm connect: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return fmt.Errorf("swarm connect HTTP %d: %s", resp.StatusCode, string(body))
	}

	return nil
}

// Health проверяет доступность Kubo
func (c *Client) Health() (bool, string) {
	reqURL := fmt.Sprintf("%s/api/v0/id", c.apiURL)

	req, err := http.NewRequest("POST", reqURL, nil)
	if err != nil {
		return false, err.Error()
	}

	if c.authToken != "" {
		req.Header.Set("Authorization", "Bearer "+c.authToken)
	}

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return false, err.Error()
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return false, fmt.Sprintf("HTTP %d", resp.StatusCode)
	}

	var result struct {
		ID string `json:"ID"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return false, err.Error()
	}

	return true, result.ID
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsImpl(s, substr))
}

func containsImpl(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
