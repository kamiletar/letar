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

// PinAddWithProgress запускает пиннинг CID и стримит прогресс через callback.
// Блокирует до завершения пиннинга или ошибки.
// Возвращает итоговое количество блоков при успехе.
//
// Защита от зависания: если Kubo не шлёт прогресс-события дольше idleTimeout —
// запрос отменяется и возвращается ошибка. Queue.go переподключится.
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

	// Idle timeout: если нет прогресс-событий дольше idleTimeout — Kubo завис.
	// Явно закрываем resp.Body — это единственный надёжный способ разблокировать
	// scanner.Scan() при зависшем стриме (context cancel не всегда работает для body read).
	idleTimer := time.AfterFunc(idleTimeout, func() {
		cancel()
		resp.Body.Close()
	})
	defer idleTimer.Stop()

	// Читаем NDJSON стрим построчно
	scanner := bufio.NewScanner(resp.Body)
	// Увеличиваем буфер для длинных строк
	scanner.Buffer(make([]byte, 0, 64*1024), 256*1024)

	lastBlocks := 0

	for scanner.Scan() {
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}

		var progress PinProgress
		if err := json.Unmarshal(line, &progress); err != nil {
			continue // Пропускаем невалидные строки
		}

		if progress.Pins != nil && len(progress.Pins) > 0 {
			// Пиннинг завершён
			if cb != nil {
				cb(lastBlocks)
			}
			return lastBlocks, nil
		}

		if progress.Progress > 0 {
			lastBlocks = progress.Progress
			idleTimer.Reset(idleTimeout) // сбрасываем таймер при каждом прогрессе
			if cb != nil {
				cb(lastBlocks)
			}
		}
	}

	if err := scanner.Err(); err != nil {
		if ctx.Err() != nil {
			return lastBlocks, fmt.Errorf("idle timeout: нет прогресса %s", idleTimeout)
		}
		return lastBlocks, fmt.Errorf("чтение стрима: %w", err)
	}

	// Стрим закрылся без финального Pins — возможно Kubo рестарт
	return lastBlocks, fmt.Errorf("стрим закрылся без подтверждения пиннинга")
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
