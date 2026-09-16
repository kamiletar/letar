#!/bin/sh
# Проверяет, что ffmpeg в образе умеет всё, на что рассчитывает воркер (src/transcode.ts).
#
# Запускается при сборке образа. ffmpeg берётся из Alpine, а версия Alpine приезжает вместе с
# плавающим тегом oven/bun:1-alpine — смена базы без нужного фильтра или декодера должна ронять
# сборку (старый воркер продолжит работать), а не выпускать воркер, который тихо портит видео:
#   zscale, tonemap — тонмаппинг HDR (без них iPhone-видео выцветает или не кодируется вовсе);
#   libdav1d        — AV1; libaom из той же сборки падает на части файлов с «No sequence header».
set -eu

missing=''

check() { # $1 — filters|encoders|decoders, $2 — имя
  if ! ffmpeg -hide_banner "-$1" 2>/dev/null | grep -Eq "^ [^ ]+ +$2 "; then
    missing="$missing $1:$2"
  fi
}

check filters scale
check filters zscale
check filters tonemap
check filters setparams
check encoders libx264
check encoders aac
check encoders mjpeg
check decoders hevc
check decoders libdav1d

if [ -n "$missing" ]; then
  echo "check-ffmpeg: в сборке ffmpeg не хватает:$missing" >&2
  exit 1
fi

ffmpeg -hide_banner -version | head -n 1
