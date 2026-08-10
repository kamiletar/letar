// Pin-Queue — сервис очереди пиннинга для IPFS Kubo.
//
// Принимает задания через HTTP API, читает NDJSON стрим прогресса pin/add,
// агрегирует данные для трекера. Работает рядом с Kubo на mail сервере.
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"animatrona-pin-queue/internal/kubo"
	"animatrona-pin-queue/internal/queue"
	"animatrona-pin-queue/internal/relay"
	"animatrona-pin-queue/internal/state"
)

type config struct {
	// Интерфейс, на котором слушает HTTP API. По умолчанию 127.0.0.1 — наружу не выставляем.
	// Сервис работает в network_mode: host, поэтому пустое значение (`:PORT`) означало бы
	// «все интерфейсы», то есть открытый из интернета порт, минуя DOCKER-USER.
	BindAddr      string
	HTTPPort      int
	KuboAPIURL    string
	KuboAuthToken string
	AuthToken     string
	StatePath     string
	CompletedTTL  time.Duration
	ProviderPeers []string
	RelayURL      string
}

func main() {
	cfg := loadConfig()

	log.Printf("Pin-Queue запуск: порт %d, Kubo %s, провайдеры: %d", cfg.HTTPPort, cfg.KuboAPIURL, len(cfg.ProviderPeers))

	// Инициализация
	store := state.New(cfg.StatePath, cfg.CompletedTTL)
	kuboClient := kubo.New(cfg.KuboAPIURL, cfg.KuboAuthToken)
	worker := queue.New(store, kuboClient, cfg.ProviderPeers)

	// Регистрация на relay (heartbeat каждые 30 мин)
	if cfg.RelayURL != "" {
		online, kuboPeerId := kuboClient.Health()
		if online && kuboPeerId != "" {
			relay.StartHeartbeat(cfg.RelayURL, kuboPeerId)
		} else {
			log.Printf("Kubo недоступен — relay регистрация отложена")
		}
	}

	// Запуск worker-а
	worker.Start()

	// HTTP API
	mux := http.NewServeMux()

	// Middleware авторизации
	auth := func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			if cfg.AuthToken != "" {
				header := r.Header.Get("Authorization")
				if !strings.HasPrefix(header, "Bearer ") || header[7:] != cfg.AuthToken {
					jsonError(w, "unauthorized", http.StatusUnauthorized)
					return
				}
			}
			next(w, r)
		}
	}

	// POST /api/pin — добавить CID в очередь
	mux.HandleFunc("/api/pin", auth(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			// DELETE /api/pin?cid=xxx — вместо /api/pin/:cid (для простоты маршрутизации)
			cid := r.URL.Query().Get("cid")
			if cid == "" {
				jsonError(w, "cid обязателен", http.StatusBadRequest)
				return
			}
			handleUnpin(w, store, kuboClient, cid)
			return
		}

		if r.Method != http.MethodPost {
			jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req struct {
			CID string `json:"cid"`
			ID  string `json:"id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "невалидный JSON", http.StatusBadRequest)
			return
		}

		if req.CID == "" {
			jsonError(w, "cid обязателен", http.StatusBadRequest)
			return
		}

		position := store.Add(req.CID, req.ID)
		worker.Notify()

		log.Printf("Задание добавлено: %s (id: %s, позиция: %d)", req.CID, req.ID, position)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"status":   "queued",
			"position": position,
		})
	}))

	// GET /api/status — полный статус очереди
	mux.HandleFunc("/api/status", auth(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// /api/status?cid=xxx — статус конкретного CID
		cid := r.URL.Query().Get("cid")
		if cid != "" {
			entry := store.Get(cid)
			if entry == nil {
				jsonError(w, "CID не найден", http.StatusNotFound)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(entry)
			return
		}

		entries := store.All()
		totalPinned := 0
		for _, e := range entries {
			if e.Status == "pinned" {
				totalPinned++
			}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"queue":       entries,
			"current":     store.Current(),
			"queueLength": store.QueueLength(),
			"totalPinned": totalPinned,
		})
	}))

	// GET /health — проверка здоровья
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		kuboOnline, kuboPeerID := kuboClient.Health()

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"status":      "ok",
			"kubo":        kuboOnline,
			"kuboPeerId":  kuboPeerID,
			"queueLength": store.QueueLength(),
			"current":     store.Current(),
		})
	})

	// Запуск HTTP сервера
	addr := fmt.Sprintf("%s:%d", cfg.BindAddr, cfg.HTTPPort)
	server := &http.Server{Addr: addr, Handler: mux}

	go func() {
		log.Printf("HTTP API запущен на %s", addr)
		if err := server.ListenAndServe(); err != http.ErrServerClosed {
			log.Fatalf("HTTP сервер: %s", err)
		}
	}()

	// Ожидание сигнала завершения
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh

	log.Println("Завершение работы...")
	server.Close()
}

func handleUnpin(w http.ResponseWriter, store *state.Store, kuboClient *kubo.Client, cid string) {
	// Удаляем из очереди (если есть)
	wasQueued := store.Remove(cid)

	// ВСЕГДА вызываем pin rm на Kubo — CID мог быть уже запинен
	pinRmErr := kuboClient.PinRm(cid)

	if wasQueued && pinRmErr != nil {
		// Был в очереди, но не был ещё запинен в Kubo — OK
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "removed"})
		return
	}

	if pinRmErr != nil {
		// Не в очереди и не запинен — ошибка
		jsonError(w, pinRmErr.Error(), http.StatusInternalServerError)
		return
	}

	// Обновляем статус в state
	store.MarkFailed(cid, "unpinned by request")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "unpinned"})
}

func loadConfig() config {
	// Парсим список провайдеров — пустые строки фильтруем
	var peers []string
	raw := envStr("PROVIDER_PEERS", "")
	if raw != "" {
		for _, p := range strings.Split(raw, ",") {
			p = strings.TrimSpace(p)
			if p != "" {
				peers = append(peers, p)
			}
		}
	}

	return config{
		BindAddr:      envStr("BIND_ADDR", "127.0.0.1"),
		HTTPPort:      envInt("HTTP_PORT", 8080),
		KuboAPIURL:    envStr("KUBO_API_URL", "http://localhost:5001"),
		KuboAuthToken: envStr("KUBO_AUTH_TOKEN", ""),
		AuthToken:     envStr("AUTH_TOKEN", ""),
		StatePath:     envStr("STATE_PATH", "/data/state.json"),
		CompletedTTL:  time.Duration(envInt("COMPLETED_TTL_HOURS", 24)) * time.Hour,
		ProviderPeers: peers,
		RelayURL:      envStr("RELAY_REGISTER_URL", ""),
	}
}

func envStr(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}

func envInt(key string, defaultVal int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return defaultVal
}

func jsonError(w http.ResponseWriter, msg string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
