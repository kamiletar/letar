# Многоступенчатая сборка pin-queue сервиса
FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod ./
COPY cmd/ cmd/
COPY internal/ internal/
RUN go mod tidy && CGO_ENABLED=0 go build -ldflags="-s -w" -o /pin-queue ./cmd/pin-queue

# Финальный образ — минимальный
FROM alpine:3.20

RUN apk add --no-cache ca-certificates wget
COPY --from=builder /pin-queue /usr/local/bin/pin-queue

RUN mkdir -p /data
VOLUME /data

EXPOSE 8080/tcp

ENTRYPOINT ["pin-queue"]
