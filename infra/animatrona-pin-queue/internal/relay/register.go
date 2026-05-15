// Регистрация Kubo PeerId на relay-сервере с heartbeat.
//
// Relay ведёт ACL белый список — без регистрации circuit relay
// отклоняет подключения с PERMISSION_DENIED.
// TTL регистрации = 60 мин, heartbeat = 30 мин.
package relay

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

const heartbeatInterval = 30 * time.Minute

// Register отправляет POST /register на relay для добавления в ACL.
func Register(relayURL, peerId string) error {
	body, _ := json.Marshal(map[string]string{
		"peer_id": peerId,
	})

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Post(relayURL, "application/json", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("relay register: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return fmt.Errorf("relay register HTTP %d: %s", resp.StatusCode, string(respBody))
	}

	return nil
}

// StartHeartbeat запускает фоновую горутину для периодической регистрации.
// Первая регистрация выполняется сразу, затем каждые 30 минут.
func StartHeartbeat(relayURL, peerId string) {
	// Первичная регистрация
	if err := Register(relayURL, peerId); err != nil {
		log.Printf("Relay регистрация: %s (продолжаем)", err)
	} else {
		log.Printf("Relay регистрация: OK (peerId: %s)", peerId[len(peerId)-8:])
	}

	// Heartbeat горутина
	go func() {
		ticker := time.NewTicker(heartbeatInterval)
		defer ticker.Stop()
		for range ticker.C {
			if err := Register(relayURL, peerId); err != nil {
				log.Printf("Relay heartbeat: %s", err)
			}
		}
	}()
}
