// ACL-фильтр с TTL для relay-сервера
//
// Реализует relay.ACLFilter — проверяет peer ID по in-memory белому списку.
// Записи автоматически удаляются по истечении TTL.
package acl

import (
	"sync"
	"time"

	"github.com/libp2p/go-libp2p/core/peer"
	ma "github.com/multiformats/go-multiaddr"

	logging "github.com/ipfs/go-log/v2"
)

var log = logging.Logger("acl")

// TTLWhitelist — in-memory белый список peer ID с автоочисткой
type TTLWhitelist struct {
	mu    sync.RWMutex
	peers map[peer.ID]time.Time // peer ID → время истечения
	ttl   time.Duration
}

// NewTTLWhitelist создаёт белый список с заданным TTL
func NewTTLWhitelist(ttl time.Duration) *TTLWhitelist {
	w := &TTLWhitelist{
		peers: make(map[peer.ID]time.Time),
		ttl:   ttl,
	}
	go w.cleanupLoop()
	return w
}

// Register добавляет peer в белый список (или продлевает TTL)
func (w *TTLWhitelist) Register(p peer.ID) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.peers[p] = time.Now().Add(w.ttl)
}

// AllowReserve — relay.ACLFilter: разрешить ли резервацию
func (w *TTLWhitelist) AllowReserve(p peer.ID, a ma.Multiaddr) bool {
	w.mu.RLock()
	defer w.mu.RUnlock()
	expiry, ok := w.peers[p]
	allowed := ok && time.Now().Before(expiry)
	if allowed {
		log.Infof("AllowReserve ALLOWED: %s (addr: %s)", p.String()[:16], a)
	} else {
		log.Warnf("AllowReserve DENIED: %s (registered: %v)", p.String()[:16], ok)
	}
	return allowed
}

// AllowConnect — relay.ACLFilter: разрешить ли соединение через relay
func (w *TTLWhitelist) AllowConnect(src peer.ID, srcAddr ma.Multiaddr, dest peer.ID) bool {
	w.mu.RLock()
	defer w.mu.RUnlock()
	now := time.Now()
	srcExp, srcOk := w.peers[src]
	dstExp, dstOk := w.peers[dest]
	allowed := srcOk && now.Before(srcExp) && dstOk && now.Before(dstExp)
	if allowed {
		log.Infof("AllowConnect ALLOWED: %s → %s", src.String()[:16], dest.String()[:16])
	} else {
		log.Warnf("AllowConnect DENIED: %s (reg:%v) → %s (reg:%v)", src.String()[:16], srcOk, dest.String()[:16], dstOk)
	}
	return allowed
}

// Count возвращает количество активных (не истёкших) зарегистрированных peer ID
func (w *TTLWhitelist) Count() int {
	w.mu.RLock()
	defer w.mu.RUnlock()
	now := time.Now()
	count := 0
	for _, expiry := range w.peers {
		if now.Before(expiry) {
			count++
		}
	}
	return count
}

// ListRegistered возвращает список активных (не истёкших) peer ID (обрезанных до 16 символов)
func (w *TTLWhitelist) ListRegistered() []string {
	w.mu.RLock()
	defer w.mu.RUnlock()
	now := time.Now()
	result := make([]string, 0, len(w.peers))
	for p, expiry := range w.peers {
		if now.Before(expiry) {
			result = append(result, p.String()[:16])
		}
	}
	return result
}

// TTLSeconds возвращает TTL в секундах
func (w *TTLWhitelist) TTLSeconds() int {
	return int(w.ttl.Seconds())
}

// cleanupLoop удаляет истёкшие записи каждые 5 минут
func (w *TTLWhitelist) cleanupLoop() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		w.mu.Lock()
		now := time.Now()
		removed := 0
		for p, expiry := range w.peers {
			if now.After(expiry) {
				delete(w.peers, p)
				removed++
			}
		}
		w.mu.Unlock()
		if removed > 0 {
			log.Infof("Очищено %d истёкших записей", removed)
		}
	}
}
