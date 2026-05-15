#!/bin/bash
# Первоначальная настройка pin-queue на сервере
set -e

echo "=== Animatrona Pin-Queue Setup ==="

# Генерация токена авторизации
if [ -z "$AUTH_TOKEN" ]; then
  AUTH_TOKEN=$(openssl rand -hex 32)
  echo "AUTH_TOKEN=$AUTH_TOKEN" >> .env
  echo "Сгенерирован AUTH_TOKEN: $AUTH_TOKEN"
fi

# Kubo auth token — должен совпадать с токеном pinner
if [ -z "$KUBO_AUTH_TOKEN" ]; then
  echo "⚠️  Установи KUBO_AUTH_TOKEN в .env (тот же токен, что у Kubo pinner)"
  echo "KUBO_AUTH_TOKEN=" >> .env
fi

echo ""
echo "1. Заполни .env файл"
echo "2. docker-compose up -d --build"
echo "3. curl http://localhost:42080/health"
