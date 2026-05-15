// Персистенция состояния очереди в JSON файл.
// Атомарная запись: write tmp → rename.
package state

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// PinEntry — запись о задании на пиннинг
type PinEntry struct {
	CID            string     `json:"cid"`
	ExternalID     string     `json:"id,omitempty"`
	Status         string     `json:"status"` // queued, pinning, pinned, failed
	ProgressBlocks int        `json:"progressBlocks"`
	RetryCount     int        `json:"retryCount,omitempty"`
	Error          string     `json:"error,omitempty"`
	CreatedAt      time.Time  `json:"createdAt"`
	StartedAt      *time.Time `json:"startedAt,omitempty"`
	FinishedAt     *time.Time `json:"finishedAt,omitempty"`
}

// Store — потокобезопасное хранилище состояния
type Store struct {
	mu      sync.RWMutex
	entries []PinEntry
	path    string
	ttl     time.Duration // TTL для завершённых записей
}

// New создаёт хранилище и загружает состояние из файла (если есть)
func New(path string, completedTTL time.Duration) *Store {
	s := &Store{
		path:    path,
		ttl:     completedTTL,
		entries: make([]PinEntry, 0),
	}
	s.load()
	return s
}

// Add добавляет CID в очередь. Возвращает позицию в очереди.
func (s *Store) Add(cid, externalID string) int {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Проверяем дубликат
	for _, e := range s.entries {
		if e.CID == cid && (e.Status == "queued" || e.Status == "pinning") {
			return s.queuePosition(cid)
		}
	}

	s.entries = append(s.entries, PinEntry{
		CID:        cid,
		ExternalID: externalID,
		Status:     "queued",
		CreatedAt:  time.Now(),
	})
	s.save()
	return s.queuePosition(cid)
}

// Remove удаляет CID из очереди (только queued). Возвращает true если удалено.
func (s *Store) Remove(cid string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, e := range s.entries {
		if e.CID == cid && e.Status == "queued" {
			s.entries = append(s.entries[:i], s.entries[i+1:]...)
			s.save()
			return true
		}
	}
	return false
}

// NextQueued возвращает следующий CID из очереди и ставит его в pinning.
func (s *Store) NextQueued() *PinEntry {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i := range s.entries {
		if s.entries[i].Status == "queued" {
			now := time.Now()
			s.entries[i].Status = "pinning"
			s.entries[i].StartedAt = &now
			s.save()
			entry := s.entries[i]
			return &entry
		}
	}
	return nil
}

// UpdateProgress обновляет количество загруженных блоков
func (s *Store) UpdateProgress(cid string, blocks int) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i := range s.entries {
		if s.entries[i].CID == cid && s.entries[i].Status == "pinning" {
			s.entries[i].ProgressBlocks = blocks
			s.save()
			return
		}
	}
}

// MarkPinned помечает CID как успешно запинённый.
// Приоритет: сначала ищем запись со статусом "pinning", затем любую с CID.
func (s *Store) MarkPinned(cid string, blocks int) {
	s.mu.Lock()
	defer s.mu.Unlock()

	idx := s.findEntry(cid, "pinning")
	if idx < 0 {
		idx = s.findEntry(cid, "")
	}
	if idx < 0 {
		return
	}

	now := time.Now()
	s.entries[idx].Status = "pinned"
	s.entries[idx].ProgressBlocks = blocks
	s.entries[idx].FinishedAt = &now
	s.entries[idx].Error = ""
	s.save()
}

// MarkFailed помечает CID как неуспешный.
// Приоритет: сначала ищем запись со статусом "pinning", затем любую с CID.
func (s *Store) MarkFailed(cid string, errMsg string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	idx := s.findEntry(cid, "pinning")
	if idx < 0 {
		idx = s.findEntry(cid, "")
	}
	if idx < 0 {
		return
	}

	now := time.Now()
	s.entries[idx].Status = "failed"
	s.entries[idx].Error = errMsg
	s.entries[idx].FinishedAt = &now
	s.save()
}

// RequeueForRetry переводит failed → queued для повторной попытки.
// Возвращает true если requeue успешен, false если лимит попыток исчерпан.
func (s *Store) RequeueForRetry(cid string, maxRetries int) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	idx := s.findEntry(cid, "failed")
	if idx < 0 {
		idx = s.findEntry(cid, "pinning")
	}
	if idx < 0 {
		return false
	}

	if s.entries[idx].RetryCount >= maxRetries {
		return false
	}

	s.entries[idx].Status = "queued"
	s.entries[idx].RetryCount++
	s.entries[idx].StartedAt = nil
	s.entries[idx].ProgressBlocks = 0
	s.save()
	return true
}

// findEntry ищет запись по CID и опционально статусу. Вызывать под блокировкой.
// Если status == "", ищет любую запись с CID.
func (s *Store) findEntry(cid, status string) int {
	for i := range s.entries {
		if s.entries[i].CID == cid {
			if status == "" || s.entries[i].Status == status {
				return i
			}
		}
	}
	return -1
}

// Get возвращает запись по CID (или nil)
func (s *Store) Get(cid string) *PinEntry {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, e := range s.entries {
		if e.CID == cid {
			entry := e
			return &entry
		}
	}
	return nil
}

// All возвращает копию всех записей
func (s *Store) All() []PinEntry {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]PinEntry, len(s.entries))
	copy(result, s.entries)
	return result
}

// QueueLength возвращает количество заданий в очереди (queued + pinning)
func (s *Store) QueueLength() int {
	s.mu.RLock()
	defer s.mu.RUnlock()

	count := 0
	for _, e := range s.entries {
		if e.Status == "queued" || e.Status == "pinning" {
			count++
		}
	}
	return count
}

// Current возвращает текущий обрабатываемый CID (или "")
func (s *Store) Current() string {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, e := range s.entries {
		if e.Status == "pinning" {
			return e.CID
		}
	}
	return ""
}

// Cleanup удаляет завершённые записи старше TTL
func (s *Store) Cleanup() int {
	s.mu.Lock()
	defer s.mu.Unlock()

	cutoff := time.Now().Add(-s.ttl)
	cleaned := 0
	filtered := make([]PinEntry, 0, len(s.entries))

	for _, e := range s.entries {
		if (e.Status == "pinned" || e.Status == "failed") && e.FinishedAt != nil && e.FinishedAt.Before(cutoff) {
			cleaned++
			continue
		}
		filtered = append(filtered, e)
	}

	if cleaned > 0 {
		s.entries = filtered
		s.save()
	}
	return cleaned
}

// HasPinning возвращает true если есть задание в статусе pinning
func (s *Store) HasPinning() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, e := range s.entries {
		if e.Status == "pinning" {
			return true
		}
	}
	return false
}

func (s *Store) queuePosition(cid string) int {
	pos := 0
	for _, e := range s.entries {
		if e.Status == "queued" || e.Status == "pinning" {
			pos++
			if e.CID == cid {
				return pos
			}
		}
	}
	return pos
}

func (s *Store) load() {
	data, err := os.ReadFile(s.path)
	if err != nil {
		return // Файла нет — пустое состояние
	}
	var entries []PinEntry
	if err := json.Unmarshal(data, &entries); err != nil {
		return
	}

	// Фильтрация при загрузке:
	// 1. pinning → queued (процесс прервался)
	// 2. Отбрасываем pinned/failed старше TTL (чтобы не накапливался мусор)
	cutoff := time.Now().Add(-s.ttl)
	filtered := make([]PinEntry, 0, len(entries))
	for i := range entries {
		e := entries[i]

		if e.Status == "pinning" {
			e.Status = "queued"
			e.StartedAt = nil
			e.ProgressBlocks = 0
		}

		// Удаляем завершённые записи старше TTL
		if (e.Status == "pinned" || e.Status == "failed") && e.FinishedAt != nil && e.FinishedAt.Before(cutoff) {
			continue
		}

		filtered = append(filtered, e)
	}
	s.entries = filtered
}

func (s *Store) save() {
	data, err := json.MarshalIndent(s.entries, "", "  ")
	if err != nil {
		return
	}
	// Атомарная запись: tmp → rename
	tmp := s.path + ".tmp"
	if err := os.MkdirAll(filepath.Dir(s.path), 0755); err != nil {
		return
	}
	if err := os.WriteFile(tmp, data, 0644); err != nil {
		return
	}
	os.Rename(tmp, s.path)
}
