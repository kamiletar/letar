# Многоступенчатая сборка кастомного relay-сервера
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Копируем go.mod и исходники, затем tidy + build
COPY go.mod ./
COPY cmd/ cmd/
COPY internal/ internal/
RUN go mod tidy && CGO_ENABLED=0 go build -ldflags="-s -w" -o /relay ./cmd/relay

# Финальный образ — минимальный
FROM alpine:3.20

RUN apk add --no-cache ca-certificates
COPY --from=builder /relay /usr/local/bin/relay

# Директория для identity ключа
RUN mkdir -p /data
VOLUME /data

EXPOSE 4001/tcp 8080/tcp

ENTRYPOINT ["relay"]
