// Кастомный IPFS relay-сервер для Animatrona
//
// Почему не стандартный Kubo relay:
// - Kubo всегда устанавливает non-nil RelayLimit → соединения transient → Bitswap не работает
// - Kubo не поддерживает ACL-фильтр через конфигурацию
//
// Этот бинарник использует go-libp2p напрямую с:
// - relay.WithInfiniteLimits() — Bitswap работает через relay
// - relay.WithACL() — белый список peer ID
// - Встроенный HTTP POST /register для регистрации
package main

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/libp2p/go-libp2p"
	"github.com/libp2p/go-libp2p/core/crypto"
	"github.com/libp2p/go-libp2p/core/host"
	"github.com/libp2p/go-libp2p/core/network"
	"github.com/libp2p/go-libp2p/core/peer"
	"github.com/libp2p/go-libp2p/p2p/protocol/circuitv2/relay"
	ma "github.com/multiformats/go-multiaddr"

	"animatrona-relay/internal/acl"

	logging "github.com/ipfs/go-log/v2"
)

var log = logging.Logger("relay")

// startTime — время запуска relay (для uptime в /debug)
var startTime = time.Now()

func main() {
	// === Логирование — максимальный debug для диагностики connection drops ===
	logging.SetLogLevel("relay", "info")
	logging.SetLogLevel("acl", "debug")

	// Circuit relay протокол
	logging.SetLogLevel("p2p-circuit", "debug")
	logging.SetLogLevel("autorelay", "debug")
	logging.SetLogLevel("relay-acl", "debug")

	// Сетевой уровень — connection lifecycle
	logging.SetLogLevel("swarm2", "debug")
	logging.SetLogLevel("basichost", "debug")
	logging.SetLogLevel("net/identify", "debug")
	logging.SetLogLevel("upgrader", "debug")

	// Connection/Resource management
	logging.SetLogLevel("connmgr", "debug")
	logging.SetLogLevel("rcmgr", "debug")

	// Muxer/Transport
	logging.SetLogLevel("muxer", "debug")
	logging.SetLogLevel("tcp-tpt", "debug")

	// Конфигурация из env
	cfg := loadConfig()

	// Загрузка или генерация ключа identity
	privKey, err := loadOrCreateIdentity(cfg.IdentityPath)
	if err != nil {
		log.Fatalf("Ошибка загрузки identity: %s", err)
	}

	// ACL-фильтр с TTL
	whitelist := acl.NewTTLWhitelist(cfg.RegistrationTTL)

	// Опции libp2p
	// TCP-only: QUIC отключён из-за несовместимости go-libp2p v0.47 с Kubo 0.40.1
	// AutoRelay Reserve() проваливается через QUIC stream — запрос не доходит до handler
	//
	// ВАЖНО: WithInfiniteLimits() задаёт Limit с бесконечным Duration/Data,
	// чтобы соединения НЕ были transient — иначе Bitswap не работает.
	// НЕ использовать WithResources() после WithInfiniteLimits() —
	// WithResources полностью заменяет все ресурсы, обнуляя Limit и ReservationTTL!
	opts := []libp2p.Option{
		libp2p.Identity(privKey),
		libp2p.ListenAddrStrings(
			fmt.Sprintf("/ip4/0.0.0.0/tcp/%d", cfg.SwarmPort),
		),
		libp2p.ForceReachabilityPublic(),
		libp2p.EnableRelayService(
			relay.WithACL(whitelist),
			relay.WithInfiniteLimits(),
		),
		libp2p.EnableHolePunching(),
		libp2p.EnableNATService(),
		// Отключаем ResourceManager — в Docker контейнере дефолтный rcmgr
		// слишком рестриктивный и может закрывать соединения клиентов.
		// Для выделенного relay с небольшим количеством peers это безопасно.
		libp2p.ResourceManager(&network.NullResourceManager{}),
	}

	// Если задан внешний IP — заменяем анонсируемые адреса
	// (в Docker relay видит только внутренние 127.0.0.1 / 172.x.x.x)
	// TCP-only — QUIC адрес убран (несовместимость с Kubo 0.40.1)
	if cfg.ExternalIP != "" {
		port := cfg.SwarmPort
		if cfg.ExternalPort > 0 {
			port = cfg.ExternalPort
		}
		extTCP, err := ma.NewMultiaddr(fmt.Sprintf("/ip4/%s/tcp/%d", cfg.ExternalIP, port))
		if err != nil {
			log.Fatalf("Невалидный EXTERNAL_IP=%s: %s", cfg.ExternalIP, err)
		}
		opts = append(opts, libp2p.AddrsFactory(func(_ []ma.Multiaddr) []ma.Multiaddr {
			return []ma.Multiaddr{extTCP}
		}))
		log.Infof("External address (TCP-only): %s:%d", cfg.ExternalIP, port)
	}

	// Создание libp2p host с relay-сервисом
	h, err := libp2p.New(opts...)
	if err != nil {
		log.Fatalf("Ошибка создания libp2p host: %s", err)
	}
	defer h.Close()

	log.Infof("Relay запущен: %s", h.ID())
	for _, addr := range h.Addrs() {
		log.Infof("  %s/p2p/%s", addr, h.ID())
	}

	// === Полное логирование network events ===
	h.Network().Notify(&network.NotifyBundle{
		ConnectedF: func(n network.Network, c network.Conn) {
			log.Infof("CONN+ %s dir=%s addr=%s total_conns=%d total_peers=%d",
				c.RemotePeer().String()[:16], c.Stat().Direction,
				c.RemoteMultiaddr(),
				len(n.ConnsToPeer(c.RemotePeer())),
				len(n.Peers()))
		},
		DisconnectedF: func(n network.Network, c network.Conn) {
			remaining := len(n.ConnsToPeer(c.RemotePeer()))
			level := "WARN"
			if remaining > 0 {
				level = "INFO" // Ещё есть соединения — не критично
			}
			_ = level
			log.Warnf("CONN- %s dir=%s addr=%s conns_remaining=%d total_peers=%d",
				c.RemotePeer().String()[:16], c.Stat().Direction,
				c.RemoteMultiaddr(), remaining, len(n.Peers()))
		},
		// Примечание: OpenedStreamF/ClosedStreamF не существуют в go-libp2p v0.47.0 NotifyBundle.
		// Stream events отслеживаются через SetStreamHandler или p2p-circuit debug логи.
	})

	// === Периодический статус (каждые 30с) ===
	go periodicStatus(h, whitelist)

	// HTTP-сервер регистрации с graceful shutdown
	srv := createHTTPServer(cfg.HTTPPort, whitelist, h)
	go func() {
		log.Infof("Registration API запущен на :%d", cfg.HTTPPort)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("HTTP-сервер: %s", err)
		}
	}()

	// Ожидание сигнала завершения
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	<-ctx.Done()

	log.Info("Завершение работы...")

	// Graceful shutdown HTTP-сервера (5 секунд таймаут)
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Warnf("HTTP shutdown: %s", err)
	}
}

// periodicStatus логирует состояние relay каждые 30 секунд
func periodicStatus(h host.Host, whitelist *acl.TTLWhitelist) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		peers := h.Network().Peers()
		log.Infof("STATUS peers=%d registered=%d uptime=%s",
			len(peers), whitelist.Count(), time.Since(startTime).Truncate(time.Second))
		for _, p := range peers {
			conns := h.Network().ConnsToPeer(p)
			totalStreams := 0
			var connDetails []string
			for _, c := range conns {
				ns := c.Stat().NumStreams
				totalStreams += ns
				age := time.Since(c.Stat().Opened).Truncate(time.Second)
				connDetails = append(connDetails,
					fmt.Sprintf("%s(streams=%d,age=%s)", c.Stat().Direction, ns, age))
			}
			log.Infof("  PEER %s conns=%d streams=%d [%s]",
				p.String()[:16], len(conns), totalStreams,
				joinStrings(connDetails, ", "))
		}
	}
}

// joinStrings — простой join без импорта strings
func joinStrings(ss []string, sep string) string {
	if len(ss) == 0 {
		return ""
	}
	result := ss[0]
	for _, s := range ss[1:] {
		result += sep + s
	}
	return result
}

// config — конфигурация relay-сервера из переменных окружения
type config struct {
	SwarmPort       int
	HTTPPort        int
	IdentityPath    string
	RegistrationTTL time.Duration
	ExternalIP      string
	ExternalPort    int
}

func loadConfig() config {
	return config{
		SwarmPort:       envInt("SWARM_PORT", 4001),
		HTTPPort:        envInt("HTTP_PORT", 8080),
		IdentityPath:    envStr("IDENTITY_PATH", "/data/relay-identity.key"),
		RegistrationTTL: time.Duration(envInt("REGISTRATION_TTL_MINUTES", 60)) * time.Minute,
		ExternalIP:      envStr("EXTERNAL_IP", ""),
		ExternalPort:    envInt("EXTERNAL_PORT", 0),
	}
}

// loadOrCreateIdentity загружает или генерирует Ed25519 ключ
func loadOrCreateIdentity(path string) (crypto.PrivKey, error) {
	data, err := os.ReadFile(path)
	if err == nil {
		key, err := crypto.UnmarshalPrivateKey(data)
		if err == nil {
			log.Info("Identity загружен из файла")
			return key, nil
		}
		log.Warnf("Не удалось десериализовать identity, генерирую новый: %s", err)
	}

	// Генерация нового ключа
	key, _, err := crypto.GenerateEd25519Key(rand.Reader)
	if err != nil {
		return nil, fmt.Errorf("генерация ключа: %w", err)
	}

	// Сохранение
	raw, err := crypto.MarshalPrivateKey(key)
	if err != nil {
		return nil, fmt.Errorf("сериализация ключа: %w", err)
	}
	if err := os.WriteFile(path, raw, 0600); err != nil {
		log.Warnf("Не удалось сохранить identity: %s", err)
	} else {
		log.Info("Новый identity сгенерирован и сохранён")
	}

	return key, nil
}

// maxRequestBodySize — максимальный размер тела запроса (1 KB достаточно для JSON с peer_id)
const maxRequestBodySize = 1024

// createHTTPServer создаёт HTTP-сервер для регистрации peer ID
func createHTTPServer(port int, whitelist *acl.TTLWhitelist, h host.Host) *http.Server {
	mux := http.NewServeMux()

	// POST /register — регистрация peer ID в белом списке
	mux.HandleFunc("/register", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Ограничение размера body — защита от OOM при большом payload
		r.Body = http.MaxBytesReader(w, r.Body, maxRequestBodySize)

		var req struct {
			PeerID     string `json:"peer_id"`
			AppVersion string `json:"app_version"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}

		pid, err := peer.Decode(req.PeerID)
		if err != nil {
			http.Error(w, "invalid peer_id", http.StatusBadRequest)
			return
		}

		whitelist.Register(pid)

		// Формируем multiaddr с peer ID
		relayAddrs := make([]string, 0, len(h.Addrs()))
		for _, addr := range h.Addrs() {
			relayAddrs = append(relayAddrs, fmt.Sprintf("%s/p2p/%s", addr, h.ID()))
		}

		log.Infof("Зарегистрирован peer %s (app: %s)", pid.String()[:16], req.AppVersion)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"status":      "registered",
			"relay_addrs": relayAddrs,
			"ttl":         whitelist.TTLSeconds(),
		})
	})

	// GET /health — проверка здоровья
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"status":           "ok",
			"peer_id":          h.ID().String(),
			"registered_peers": whitelist.Count(),
			"connected_peers":  len(h.Network().Peers()),
			"addrs":            multiaddrsToStrings(h.Addrs()),
			"uptime":           time.Since(startTime).Truncate(time.Second).String(),
		})
	})

	// GET /debug — подробная информация о connected peers
	mux.HandleFunc("/debug", func(w http.ResponseWriter, r *http.Request) {
		peers := h.Network().Peers()
		peerInfos := make([]map[string]any, 0, len(peers))
		for _, p := range peers {
			conns := h.Network().ConnsToPeer(p)
			connInfos := make([]map[string]any, 0, len(conns))
			for _, c := range conns {
				connInfos = append(connInfos, map[string]any{
					"direction":  c.Stat().Direction.String(),
					"remote_addr": c.RemoteMultiaddr().String(),
					"streams":    c.Stat().NumStreams,
					"opened":     c.Stat().Opened.Format(time.RFC3339),
					"age":        time.Since(c.Stat().Opened).Truncate(time.Second).String(),
				})
			}
			peerInfos = append(peerInfos, map[string]any{
				"peer_id": p.String()[:20],
				"conns":   connInfos,
			})
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"peers":              peerInfos,
			"total_peers":        len(peers),
			"registered_peers":   whitelist.Count(),
			"registered_list":    whitelist.ListRegistered(),
			"uptime":             time.Since(startTime).Truncate(time.Second).String(),
		})
	})

	return &http.Server{
		Addr:         fmt.Sprintf(":%d", port),
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  30 * time.Second,
	}
}

func multiaddrsToStrings(addrs []ma.Multiaddr) []string {
	result := make([]string, len(addrs))
	for i, a := range addrs {
		result[i] = a.String()
	}
	return result
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
