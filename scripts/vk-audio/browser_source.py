"""Чтение доступной веб-библиотеки VK через локальную сессию Brave."""

from __future__ import annotations

from http.cookiejar import MozillaCookieJar
from http.cookies import SimpleCookie, CookieError
import json
import os
from pathlib import Path
import re
import threading
from typing import Any
from urllib.parse import urlsplit

import requests
from bs4 import BeautifulSoup
from requests.cookies import RequestsCookieJar, create_cookie
from vk_api.audio import scrap_ids, scrap_tracks
from vk_api.vk_api import DEFAULT_USERAGENT


class BrowserSourceError(Exception):
    """Диагностика браузерного режима без значений cookies и URL аудио."""


def is_vk_domain(domain: str) -> bool:
    host = domain.lstrip(".").lower()
    return any(host == root or host.endswith("." + root) for root in ("vk.ru", "vk.com"))


def session_id_from_html(page: str) -> int:
    """Читает только верхний id объекта vk, пропуская вложенные объекты и строки."""
    start = re.search(r'\bvk\s*=\s*\{', page)
    if start:
        depth = 1
        quote = None
        escaped = False
        for index in range(start.end(), len(page)):
            char = page[index]
            if quote:
                if escaped:
                    escaped = False
                elif char == "\\":
                    escaped = True
                elif char == quote:
                    quote = None
                continue
            if depth == 1 and (page[index - 1].isspace() or page[index - 1] in "{,"):
                field = re.match(r'(?:id|["\']id["\'])\s*:\s*(\d+)\b', page[index:index + 100])
                if field:
                    return int(field.group(1))
            if char in "\"'`":
                quote = char
            elif char == "{":
                depth += 1
            elif char == "}":
                depth -= 1
                if not depth:
                    break
    for pattern in (r'\bvk\.id\s*=\s*(\d+)', r'["\']currentUserId["\']\s*:\s*(\d+)'):
        match = re.search(pattern, page)
        if match:
            return int(match.group(1))
    return 0


def load_vk_cookies(cookie_file: Path | None = None, profile: str | None = None) -> RequestsCookieJar:
    result = RequestsCookieJar()
    if cookie_file:
        try:
            content = cookie_file.read_text(encoding="utf-8-sig").strip()
            if cookie_file.suffix.lower() == ".json":
                data = json.loads(content)
                rows = data.get("cookies", []) if isinstance(data, dict) else data
                if not isinstance(rows, list):
                    raise ValueError()
                for row in rows:
                    if not isinstance(row, dict) or not is_vk_domain(str(row.get("domain", ""))):
                        continue
                    expires = row.get("expirationDate", row.get("expires"))
                    result.set_cookie(create_cookie(
                        name=row["name"], value=row["value"], domain=row["domain"],
                        path=row.get("path", "/"), secure=bool(row.get("secure", True)),
                        expires=int(expires) if expires and float(expires) > 0 else None,
                    ))
            elif content.startswith("#") or "\t" in content:
                jar = MozillaCookieJar(str(cookie_file))
                jar.load(ignore_discard=True, ignore_expires=True)
                for cookie in jar:
                    if is_vk_domain(cookie.domain):
                        if cookie.expires == 0:
                            cookie.expires = None
                            cookie.discard = True
                        result.set_cookie(cookie)
            else:
                if content.lower().startswith("cookie:"):
                    content = content.split(":", 1)[1].strip()
                header = SimpleCookie()
                header.load(content)
                for name, cookie in header.items():
                    result.set_cookie(create_cookie(name=name, value=cookie.value, domain=".vk.ru", secure=True))
        except (OSError, ValueError, KeyError, TypeError, CookieError):
            raise BrowserSourceError("Не удалось прочитать cookies: нужен Cookie header, Netscape TXT или JSON-экспорт.") from None
    else:
        import browser_cookie3

        # Чтение обычного профиля не должно создавать системные shadow-copy.
        browser_cookie3.shadowcopy = None
        database = None
        if profile:
            if not re.fullmatch(r"Default|Profile \d+", profile):
                raise BrowserSourceError("Профиль Brave: Default или Profile N.")
            if os.name != "nt":
                raise BrowserSourceError("--brave-profile в этой версии поддерживается на Windows.")
            root = Path(os.environ.get("LOCALAPPDATA", "")) / "BraveSoftware/Brave-Browser/User Data"
            database = root / profile / "Network/Cookies"
            if not database.is_file():
                database = root / profile / "Cookies"
        failures = []
        for domain in ("vk.ru", "vk.com"):
            try:
                jar = browser_cookie3.brave(cookie_file=str(database) if database else None, domain_name=domain)
                for cookie in jar:
                    if is_vk_domain(cookie.domain):
                        result.set_cookie(cookie)
            except Exception as error:
                # Исключения библиотек могут содержать секреты: выводим только тип.
                message = str(error)
                if "Unable to read database file" in message:
                    failures.append("файл Cookies занят или недоступен")
                elif "decrypt" in message.lower() or "Unable to get key" in message:
                    failures.append("неподдерживаемое шифрование cookies")
                else:
                    failures.append(type(error).__name__)
        if not result and failures:
            raise BrowserSourceError(
                f"Не удалось прочитать cookies Brave ({', '.join(sorted(set(failures)))}). "
                "Возможны блокировка файла или неподдерживаемое шифрование. "
                "Сохраните строку Cookie из DevTools в файл и укажите --cookies cookies-header.txt."
            )
    for cookie in list(result):
        if cookie.is_expired():
            result.clear(cookie.domain, cookie.path, cookie.name)
    if not any(cookie.name in ("remixsid", "remixsid6") and cookie.value for cookie in result):
        raise BrowserSourceError(
            "В выбранном профиле/файле нет активной сессии VK. "
            "Войдите в VK в Brave или укажите --brave-profile / --cookies."
        )
    return result


class WebAudioClient:
    """Совместимый интерфейс для получения списков без вызовов официального API."""

    def __init__(self, session: requests.Session, cookies: RequestsCookieJar,
                 stop: threading.Event, limit: int | None = None, target_keys: set[str] | None = None):
        self.http = session
        self.http.headers["User-Agent"] = DEFAULT_USERAGENT
        self.http.cookies.update(cookies)
        self.stop = stop
        self.limit = limit
        self.target_keys = target_keys
        self.user_id = 0
        for cookie in cookies:
            if cookie.name == "remixmid" and cookie.value.isdigit():
                self.user_id = int(cookie.value)
                break
        if not self.user_id:
            response = self.get("https://vk.ru/feed")
            self.user_id = session_id_from_html(response.text)
        if not self.user_id:
            raise BrowserSourceError("Не удалось определить ID своей сессии VK. Обновите экспорт cookies.")

    def request(self, method: str, url: str, **kwargs: Any) -> requests.Response:
        kwargs.setdefault("timeout", (10, 30))
        for attempt in range(4):
            if self.stop.is_set():
                raise BrowserSourceError("Получение списка прервано.")
            try:
                response = self.http.request(method, url, **kwargs)
                if response.status_code == 429 or 500 <= response.status_code < 600:
                    if attempt < 3:
                        response.close()
                        self.stop.wait(2 ** attempt)
                        continue
                response.raise_for_status()
                if response.status_code in (301, 302, 303, 307, 308):
                    raise BrowserSourceError("VK перенаправил запрос. Проверьте авторизацию браузерной сессии.")
                if not is_vk_domain(urlsplit(response.url).hostname or ""):
                    raise BrowserSourceError("VK перенаправил на страницу авторизации. Обновите сессию.")
                return response
            except requests.RequestException as error:
                if attempt < 3 and isinstance(error, (requests.Timeout, requests.ConnectionError)):
                    self.stop.wait(2 ** attempt)
                    continue
                status = error.response.status_code if error.response is not None else None
                detail = f"HTTP {status}" if status else type(error).__name__
                raise BrowserSourceError(f"Ошибка веб-запроса VK: {detail}.") from None
        raise BrowserSourceError("Не удалось получить ответ VK.")

    def get(self, url: str, **kwargs: Any) -> requests.Response:
        return self.request("GET", url, **kwargs)

    def post(self, url: str, **kwargs: Any) -> requests.Response:
        return self.request("POST", url, **kwargs)

    def method(self, method: str, params: dict[str, Any]) -> Any:
        if method == "utils.resolveScreenName":
            page = self.get("https://vk.ru/" + params["screen_name"]).text
            candidates = set(re.findall(r'\b(?:pageOwnerId|owner_id|ownerId)\s*["\']?\s*[:=]\s*(-?\d+)', page))
            if len(candidates) != 1:
                raise BrowserSourceError("Не удалось определить ID по короткой ссылке. Укажите числовой ID.")
            owner = int(candidates.pop())
            return {"type": "group" if owner < 0 else "user", "object_id": abs(owner)}
        if method != "audio.get":
            raise BrowserSourceError("Неподдерживаемый метод браузерного источника.")
        rows = self.fetch(int(params["owner_id"]))
        return {"count": len(rows), "items": rows}

    def fetch(self, owner: int) -> list[dict[str, Any]]:
        items: dict[tuple[int, int], dict[str, Any]] = {}
        offset = 0
        while True:
            response = self.post(
                "https://m.vk.ru/audio",
                data={"act": "load_section", "owner_id": owner, "playlist_id": -1,
                      "offset": offset, "type": "playlist", "is_loading_all": 1},
                headers={"X-Requested-With": "XMLHttpRequest"}, allow_redirects=False,
            )
            try:
                payload = response.json()["data"][0]
                rows = payload["list"]
                more = payload["hasMore"]
                if not isinstance(rows, list) or not isinstance(more, (bool, int)):
                    raise ValueError()
            except (ValueError, TypeError, KeyError, IndexError):
                raise BrowserSourceError(
                    "VK не вернул веб-список аудио. Возможны истёкшая сессия, "
                    "проверка входа или изменение веб-протокола."
                ) from None
            count_before = len(items)
            selected = []
            for row in rows:
                if not isinstance(row, list) or len(row) < 6:
                    raise BrowserSourceError("Изменился формат веб-аудиозаписи VK.")
                try:
                    key = (int(row[1]), int(row[0]))
                except (TypeError, ValueError):
                    raise BrowserSourceError("VK вернул некорректный audio ID.") from None
                if key in items:
                    continue
                items[key] = {"id": key[1], "owner_id": key[0],
                              "title": BeautifulSoup(str(row[3]).strip(), "html.parser").text,
                              "artist": BeautifulSoup(str(row[4]), "html.parser").text, "url": ""}
                selected.append(row)
                if self.limit and len(items) >= self.limit:
                    break
            if more and len(items) == count_before:
                raise BrowserSourceError("VK возвращает пустую/повторяющуюся страницу при hasMore.")
            ids = []
            for row in selected:
                if self.target_keys is not None and f"{row[1]}_{row[0]}" not in self.target_keys:
                    continue
                try:
                    ids.extend(scrap_ids([row]))
                except (IndexError, TypeError, AttributeError):
                    # Записи без хэшей сохраняются в списке с пустым URL.
                    pass
            try:
                for index in range(0, len(ids), 10):
                    if self.stop.is_set():
                        raise BrowserSourceError("Получение списка прервано.")
                    if index and self.stop.wait(1.5):
                        raise BrowserSourceError("Получение списка прервано.")
                    for track in scrap_tracks(ids[index:index + 10], self.user_id, self,
                                              convert_m3u8_links=False):
                        key = (int(track["owner_id"]), int(track["id"]))
                        if key in items:
                            items[key].update(track)
                    if index % 100 == 0:
                        print(f"Получаю ссылки VK: {min(index + 10, len(ids))} / {len(ids)}", flush=True)
            except (ValueError, KeyError, TypeError, IndexError, AttributeError):
                raise BrowserSourceError("Изменился формат ответа VK при получении ссылок аудио.") from None
            if not more or (self.limit and len(items) >= self.limit):
                return list(items.values())
            offset += len(rows)
            if self.stop.wait(2):
                raise BrowserSourceError("Получение списка прервано.")
