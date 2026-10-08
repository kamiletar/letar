#!/usr/bin/env python3
"""Пакетное скачивание прямых MP3-ссылок, доступных через VK audio.get."""

from __future__ import annotations

import argparse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
import hashlib
import html
import logging
import os
from pathlib import Path
import re
import sys
import threading
from typing import Any
from urllib.parse import urlsplit

import requests
import vk_api
from dotenv import load_dotenv
from vk_api.exceptions import ApiError, ApiHttpError


__version__ = "1.0.0"
PAGE_SIZE = 2000
MAX_RETRIES = 3
TIMEOUT = (10, 30)
INVALID_CHARS = re.compile(r'[\\/:*?"<>|\x00-\x1f\x7f]')
RESERVED_NAMES = re.compile(r"^(CON|PRN|AUX|NUL|COM[1-9¹²³]|LPT[1-9¹²³])(?:\.|$)", re.I)


class DownloadError(Exception):
    """Ошибка получения списка или формата файла без секретных данных."""


class TimedSession(requests.Session):
    """Ограничивает ожидание ответов VK API."""

    def request(self, method: str, url: str, **kwargs: Any) -> requests.Response:
        kwargs.setdefault("timeout", TIMEOUT)
        return super().request(method, url, **kwargs)


@dataclass(frozen=True)
class Track:
    key: str
    label: str
    url: str
    path: Path


@dataclass(frozen=True)
class Result:
    status: str
    detail: str = ""


def safe_name(value: str) -> str:
    """Очищает имя, включая служебные имена и конечные точки Windows."""
    value = INVALID_CHARS.sub("_", html.unescape(value)).strip().rstrip(". ")
    if not value:
        value = "Без названия"
    if RESERVED_NAMES.match(value):
        value = "_" + value
    return value


def short_name(value: str, limit: int = 160) -> str:
    # Лимит в байтах соблюдает ограничения Windows и большинства Linux ФС.
    encoded = value.encode("utf-8")
    if len(encoded) <= limit:
        return value
    digest = hashlib.sha256(encoded).hexdigest()[:10]
    return encoded[:limit - 12].decode("utf-8", errors="ignore").rstrip(". ") + "__" + digest


def prepare_tracks(items: list[dict[str, Any]], directory: Path, owner: int) -> list[Track]:
    """Закрепляет уникальные пути до запуска потоков."""
    rows: dict[str, tuple[str, str]] = {}
    for item in items:
        artist = safe_name(str(item.get("artist") or "Неизвестный исполнитель"))
        title = safe_name(str(item.get("title") or "Без названия"))
        label = short_name(f"{artist} - {title}")
        audio_id = item.get("id")
        if audio_id is None:
            raise DownloadError("VK вернул аудиозапись без id; безопасное сохранение невозможно.")
        key = f"{item.get('owner_id', owner)}_{audio_id}"
        url = str(item.get("url") or "").strip()
        # Повтор одного audio ID не запускает конкурентную запись одного файла.
        if key not in rows or not rows[key][1]:
            rows[key] = (label, url)

    counts = Counter(label.casefold() for label, _ in rows.values())
    tracks = []
    used: set[str] = set()
    for key, (label, url) in rows.items():
        stem = label
        if counts[label.casefold()] > 1:
            stem += "__" + hashlib.sha256(key.encode()).hexdigest()[:12]
        # Учитывает и название, совпавшее с автоматически добавленным суффиксом.
        while stem.casefold() in used:
            stem += "_"
        used.add(stem.casefold())
        tracks.append(Track(key, label, url, directory / f"{stem}.mp3"))
    return tracks


def retry_delay(attempt: int, response: requests.Response | None = None) -> float:
    delay = float(2 ** attempt)
    if response is not None:
        header = response.headers.get("Retry-After", "")
        try:
            seconds = float(header)
        except ValueError:
            try:
                target = parsedate_to_datetime(header)
                if target.tzinfo is None:
                    target = target.replace(tzinfo=timezone.utc)
                seconds = (target - datetime.now(timezone.utc)).total_seconds()
            except (ValueError, TypeError, OverflowError):
                seconds = 0
        delay = max(delay, seconds)
    return min(delay, 300)


def api_call(api: Any, method: str, stop: threading.Event, **params: Any) -> Any:
    """Повторяет временные ошибки, не печатая токен и параметры запросов."""
    for attempt in range(MAX_RETRIES + 1):
        if stop.is_set():
            raise DownloadError("Получение списка прервано.")
        try:
            return api.method(method, params)
        except ApiError as error:
            if error.code in (5, 7, 15, 27, 28):
                raise DownloadError(
                    f"VK API: код {error.code}. Проверьте пользовательский токен, "
                    "доступ приложения к audio.get и доступность списка. "
                    "Обычное право audio не открывает закрытый аудио API."
                ) from None
            if error.code not in (6, 9, 10, 29) or attempt == MAX_RETRIES:
                raise DownloadError(f"VK API: код {error.code}, метод {method}.") from None
        except ApiHttpError as error:
            status = error.response.status_code
            if not (status == 429 or 500 <= status < 600) or attempt == MAX_RETRIES:
                raise DownloadError(f"VK API: HTTP {status}.") from None
        except requests.RequestException as error:
            if attempt == MAX_RETRIES:
                raise DownloadError(f"VK API: сетевая ошибка {type(error).__name__}.") from None
        except ValueError:
            raise DownloadError("VK API вернул некорректный JSON.") from None
        stop.wait(retry_delay(attempt))
    raise DownloadError("VK API не ответил.")


def resolve_owner(value: str, api: Any, stop: threading.Event) -> int:
    reference = value.strip()
    if "://" in reference or reference.startswith(("vk.ru/", "vk.com/")):
        parsed = urlsplit(reference if "://" in reference else "https://" + reference)
        if parsed.scheme not in ("https", "http") or parsed.hostname not in (
            "vk.ru", "vk.com", "www.vk.ru", "www.vk.com", "m.vk.ru", "m.vk.com"
        ):
            raise DownloadError("Нужна ссылка на профиль vk.ru/vk.com или числовой ID.")
        reference = parsed.path.strip("/")
    matched = re.fullmatch(r"(?:audios|id)?(-?\d+)", reference)
    if matched:
        owner = int(matched.group(1))
        if owner == 0:
            raise DownloadError("Owner ID не может быть нулём.")
        return owner
    if not re.fullmatch(r"[A-Za-z0-9_.]+", reference):
        raise DownloadError("Нужен профиль или audios<ID>; ссылки на отдельные плейлисты не поддерживаются.")
    resolved = api_call(api, "utils.resolveScreenName", stop, screen_name=reference)
    if not resolved or resolved.get("type") not in ("user", "group"):
        raise DownloadError(f"Не найден профиль: {reference}.")
    owner = int(resolved["object_id"])
    return -owner if resolved["type"] == "group" else owner


def fetch_tracks(api: Any, owner: int, stop: threading.Event) -> list[dict[str, Any]]:
    params = {"owner_id": owner, "count": PAGE_SIZE}
    items: list[dict[str, Any]] = []
    seen: set[str] = set()
    while True:
        response = api_call(api, "audio.get", stop, **params)
        if not isinstance(response, dict) or not isinstance(response.get("items"), list):
            raise DownloadError("Неожиданный формат audio.get: нужны count и items.")
        batch = response["items"]
        total = response.get("count")
        if not isinstance(total, int) or total < 0 or any(not isinstance(row, dict) for row in batch):
            raise DownloadError("Некорректный count/items в ответе audio.get.")
        new_keys = {f"{row.get('owner_id', owner)}_{row.get('id')}" for row in batch}
        if len(items) < total and (not batch or not new_keys.difference(seen)):
            raise DownloadError("VK вернул неполный или повторяющийся список; скачивание не начато.")
        items.extend(batch)
        seen.update(new_keys)
        if len(items) >= total:
            return items
        if "offset" not in params:
            print(f"VK сообщил {total} треков, вернул {len(batch)}. Получаю остальные страницы.")
        params["offset"] = len(items)


def looks_like_mp3(data: bytes) -> bool:
    if data.lstrip().startswith((b"<", b"{", b"[", b"#EXTM3U")):
        return False
    if data.startswith(b"ID3"):
        return True
    # MPEG Layer III, версия 1/2/2.5; исключает AAC ADTS и резервные значения.
    for index in range(max(0, len(data) - 3)):
        frame = data[index:index + 4]
        if (frame[0] == 0xFF and frame[1] & 0xE0 == 0xE0
                and (frame[1] >> 3) & 3 != 1 and (frame[1] >> 1) & 3 == 1
                and (frame[2] >> 4) not in (0, 15) and (frame[2] >> 2) & 3 != 3):
            return True
    return False


def download_track(track: Track, stop: threading.Event, log: logging.Logger,
                   base_delay: float = 1.0) -> Result:
    part = track.path.with_suffix(".mp3.part")
    try:
        if not track.url:
            return Result("no_url")
        if track.path.is_file() and track.path.stat().st_size > 0:
            return Result("existing")
        parsed = urlsplit(track.url)
        if parsed.scheme not in ("https", "http") or not parsed.hostname:
            return Result("error", "Некорректная прямая ссылка")
        if parsed.path.lower().endswith(".m3u8"):
            return Result("error", "HLS-плейлист: требуется отдельная обработка, это не MP3")
        for attempt in range(MAX_RETRIES + 1):
            if stop.is_set():
                return Result("cancelled")
            response = None
            try:
                with requests.get(track.url, stream=True, timeout=TIMEOUT,
                                  headers={"Accept-Encoding": "identity"}) as response:
                    if response.status_code != 200:
                        response.raise_for_status()
                        raise DownloadError(f"Неожиданный HTTP {response.status_code}")
                    length = response.headers.get("Content-Length")
                    expected = int(length) if length is not None else None
                    if expected is not None and expected <= 0:
                        raise DownloadError("Пустой ответ")
                    prefix = b""
                    size = 0
                    with part.open("wb") as output:
                        for chunk in response.iter_content(chunk_size=64 * 1024):
                            if stop.is_set():
                                return Result("cancelled")
                            if chunk:
                                prefix = (prefix + chunk)[:8192] if len(prefix) < 8192 else prefix
                                output.write(chunk)
                                size += len(chunk)
                    if not size:
                        raise DownloadError("Пустой файл")
                    if (expected is not None and not response.headers.get("Content-Encoding")
                            and size != expected):
                        raise requests.ConnectionError("Неполный ответ")
                    if not looks_like_mp3(prefix):
                        raise DownloadError("Ответ не похож на MP3 (возможны HTML, HLS или другой формат)")
                # Только завершённая загрузка получает расширение .mp3.
                part.replace(track.path)
                return Result("downloaded")
            except requests.RequestException as error:
                status = error.response.status_code if error.response is not None else None
                retryable = (isinstance(error, (requests.Timeout, requests.ConnectionError,
                                                requests.exceptions.ChunkedEncodingError))
                             or status == 429 or (status is not None and 500 <= status < 600))
                detail = f"HTTP {status}" if status is not None else type(error).__name__
                if not retryable or attempt == MAX_RETRIES:
                    return Result("error", detail)
                delay = retry_delay(attempt, response) * base_delay
                log.warning("Повтор %s/%s: %s [%s], %s, пауза %.1f с",
                            attempt + 1, MAX_RETRIES, track.label, track.key, detail, delay)
                if stop.wait(delay):
                    return Result("cancelled")
            except (DownloadError, ValueError) as error:
                detail = str(error) if isinstance(error, DownloadError) else "Некорректный Content-Length"
                return Result("error", detail)
    except OSError as error:
        return Result("error", f"Ошибка файловой системы: {type(error).__name__}")
    finally:
        try:
            part.unlink(missing_ok=True)
        except OSError:
            log.warning("Не удалось удалить временный файл: %s", part.name)
    return Result("error", "Исчерпаны повторы")


def setup_log(directory: Path) -> tuple[logging.Logger, logging.Logger]:
    logs = []
    for name, filename in (("vk-download", "download.log"), ("vk-skipped", "skipped.log")):
        logger = logging.getLogger(name)
        logger.setLevel(logging.INFO)
        logger.propagate = False
        for handler in logger.handlers[:]:
            logger.removeHandler(handler)
            handler.close()
        handler = logging.FileHandler(directory / filename, encoding="utf-8")
        handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
        logger.addHandler(handler)
        logs.append(logger)
    return logs[0], logs[1]


def run_downloads(tracks: list[Track], workers: int, stop: threading.Event,
                  log: logging.Logger, skipped: logging.Logger) -> Counter:
    counts: Counter = Counter()
    lock = threading.Lock()
    labels = {"downloaded": "скачано", "existing": "уже на диске", "no_url": "нет URL",
              "error": "ошибка", "cancelled": "отменено"}

    def task(track: Track) -> Result:
        if not stop.is_set():
            with lock:
                print(f"[Загружено: {counts['downloaded']} / {len(tracks)}] Скачивается: {track.label}",
                      flush=True)
        return download_track(track, stop, log)

    pool = ThreadPoolExecutor(max_workers=workers)
    try:
        futures = {pool.submit(task, track): track for track in tracks}
        for future in as_completed(futures):
            track = futures[future]
            result = future.result()
            with lock:
                counts[result.status] += 1
                done = sum(counts.values())
                print(f"[Обработано: {done} / {len(tracks)}; загружено: {counts['downloaded']}] "
                      f"{track.label} — {labels[result.status]}", flush=True)
            if result.status == "no_url":
                skipped.info("Нет URL: %s [%s]", track.label, track.key)
            elif result.status == "error":
                log.error("%s [%s]: %s", track.label, track.key, result.detail)
            else:
                log.info("%s: %s [%s]", result.status, track.label, track.key)
    except KeyboardInterrupt:
        stop.set()
        print("\nОстановка: ожидаю завершения текущих запросов. Готовые MP3 сохранены.")
        counts["interrupted"] = 1
    finally:
        pool.shutdown(wait=True, cancel_futures=True)
    return counts


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("profiles", nargs="*", default=["20157923"], help="ID или ссылки на профили VK")
    parser.add_argument("--output", type=Path, default=Path("vk_downloaded_music"), help="Папка MP3 и логов")
    parser.add_argument("--env", type=Path, default=Path(__file__).with_name(".env"), help="Файл с VK_ACCESS_TOKEN")
    parser.add_argument("--workers", type=int, choices=range(1, 9), default=6, help="1–8 потоков, по умолчанию 6")
    parser.add_argument("--check", action="store_true", help="Проверить API и число URL без загрузки файлов")
    parser.add_argument("--version", action="version", version=__version__)
    args = parser.parse_args(argv)
    stop = threading.Event()
    loggers: tuple[logging.Logger, ...] = ()
    try:
        load_dotenv(args.env, override=False)
        token = os.environ.get("VK_ACCESS_TOKEN", "").strip()
        if not token:
            print("Не задан VK_ACCESS_TOKEN. Заполните .env рядом со скриптом или переменную окружения.",
                  file=sys.stderr)
            return 2
        args.output.mkdir(parents=True, exist_ok=True)
        log, skipped = setup_log(args.output)
        loggers = (log, skipped)
        totals: Counter = Counter()
        owner_errors = 0
        with TimedSession() as session:
            api = vk_api.VkApi(token=token, api_version=os.getenv("VK_API_VERSION", "5.199"), session=session,
                               config_filename=str(args.output / "vk_config.json"))
            # Обработчик vk_api для кода 6 рекурсивен; повторы ограничивает api_call.
            api.error_handlers.pop(6, None)
            owners: set[int] = set()
            for profile in args.profiles:
                try:
                    owner = resolve_owner(profile, api, stop)
                    if owner in owners:
                        continue
                    owners.add(owner)
                    items = fetch_tracks(api, owner, stop)
                    directory = args.output / str(owner) if len(args.profiles) > 1 else args.output
                    directory.mkdir(parents=True, exist_ok=True)
                    tracks = prepare_tracks(items, directory, owner)
                    urls = sum(bool(track.url) for track in tracks)
                    print(f"Профиль {owner}: {len(tracks)} уникальных треков, URL есть у {urls}.")
                    log.info("Профиль %s: %s треков, %s URL", owner, len(tracks), urls)
                    if not args.check:
                        result = run_downloads(tracks, args.workers, stop, log, skipped)
                        totals.update(result)
                        if stop.is_set():
                            break
                except DownloadError as error:
                    owner_errors += 1
                    print(f"Ошибка списка: {error}", file=sys.stderr)
                    log.error("Ошибка списка: %s", error)
        if not args.check:
            print(f"\nОтчёт: скачано {totals['downloaded']}; уже на диске {totals['existing']}; "
                  f"без URL {totals['no_url']}; ошибок загрузки {totals['error']}; "
                  f"ошибок получения списков {owner_errors}.")
        print(f"Папка: {args.output.resolve()}")
        if stop.is_set():
            return 130
        return 1 if owner_errors or totals["error"] else 0
    except KeyboardInterrupt:
        stop.set()
        print("\nОстановлено. Повторите команду для продолжения.", file=sys.stderr)
        return 130
    except OSError as error:
        print(f"Ошибка файловой системы: {type(error).__name__}.", file=sys.stderr)
        return 1
    finally:
        for logger in loggers:
            for handler in logger.handlers[:]:
                logger.removeHandler(handler)
                handler.close()


if __name__ == "__main__":
    sys.exit(main())
