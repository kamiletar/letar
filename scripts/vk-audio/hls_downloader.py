"""Сохранение доступного HLS-аудиопотока в MP3 через установленный ffmpeg."""

from pathlib import Path
import shutil
import subprocess
import threading
import time


class HlsError(Exception):
    """Ошибка ffmpeg без URL и параметров сессии."""

    def __init__(self, message: str, retryable: bool = False):
        super().__init__(message)
        self.retryable = retryable


def convert_hls(url: str, target: Path, stop: threading.Event) -> bool:
    executable = shutil.which("ffmpeg")
    if not executable:
        raise HlsError("Для HLS нужен ffmpeg в PATH")
    command = [executable, "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
               "-rw_timeout", "30000000", "-protocol_whitelist", "http,https,tcp,tls,crypto",
               "-i", url, "-vn", "-codec:a", "libmp3lame", "-q:a", "2", "-threads", "1",
               "-f", "mp3", str(target)]
    flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
    process = subprocess.Popen(command, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, creationflags=flags)
    deadline = time.monotonic() + 600
    try:
        while True:
            if stop.is_set():
                return False
            if time.monotonic() >= deadline:
                raise HlsError("Таймаут обработки HLS", retryable=True)
            try:
                _, stderr = process.communicate(timeout=0.5)
                break
            except subprocess.TimeoutExpired:
                continue
        if process.returncode:
            text = stderr.decode("utf-8", errors="replace").lower()
            server_error = "http error 5" in text or "server returned 5xx" in text
            retryable = server_error or any(marker in text for marker in (
                "http error 429", "timed out", "connection reset", "connection refused"
            ))
            detail = "сервер аудио вернул HTTP 5xx" if server_error else "не удалось получить или обработать HLS-поток"
            raise HlsError(f"ffmpeg: {detail}", retryable=retryable)
        if not target.is_file() or not target.stat().st_size:
            raise HlsError("ffmpeg создал пустой файл")
        return True
    finally:
        if process.poll() is None:
            process.kill()
        process.communicate()
