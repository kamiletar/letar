"""Проверки браузерного backend без чтения личного профиля Brave."""

from contextlib import redirect_stdout
import io
import json
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import Mock, patch

from requests.cookies import RequestsCookieJar

import browser_source as web


def cookie_jar():
    jar = RequestsCookieJar()
    jar.set("remixsid", "TEST_SESSION", domain=".vk.ru")
    jar.set("remixmid", "123", domain=".vk.ru")
    return jar


def audio_row(audio_id, hashes="/".join(["a", "b", "action", "d", "e", "url"])):
    row = [audio_id, 50, "", "Title", "Artist", 100] + [""] * 8
    row[13] = hashes
    return row


class BrowserTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.directory = Path(self.temp.name)

    def tearDown(self):
        self.temp.cleanup()

    def test_cookie_header_and_json_filter(self):
        path = self.directory / "cookies-header.txt"
        path.write_text("Cookie: remixsid=TEST_SESSION; remixmid=123", encoding="utf-8")
        jar = web.load_vk_cookies(path)
        self.assertEqual(len(jar), 2)
        self.assertTrue(all(cookie.domain == ".vk.ru" for cookie in jar))
        path = self.directory / "cookies.json"
        path.write_text(json.dumps([
            {"name": "remixsid", "value": "TEST_SESSION", "domain": ".vk.ru"},
            {"name": "other", "value": "PRIVATE", "domain": ".unrelated.invalid"},
            {"name": "fake", "value": "PRIVATE", "domain": ".vk.ru.evil.invalid"},
        ]), encoding="utf-8")
        self.assertEqual(len(web.load_vk_cookies(path)), 1)

    def test_netscape_httponly_and_expired_session(self):
        path = self.directory / "cookies.txt"
        path.write_text("# Netscape HTTP Cookie File\n#HttpOnly_.vk.ru\tTRUE\t/\tTRUE\t0\tremixsid\tTEST_SESSION\n",
                        encoding="utf-8")
        self.assertEqual(len(web.load_vk_cookies(path)), 1)
        path.write_text("# Netscape HTTP Cookie File\n.vk.ru\tTRUE\t/\tTRUE\t1\tremixsid\tEXPIRED\n",
                        encoding="utf-8")
        with self.assertRaises(web.BrowserSourceError):
            web.load_vk_cookies(path)

    def test_brave_read_is_scoped_to_vk_and_errors_redacted(self):
        import browser_cookie3

        jar = cookie_jar()
        jar.set("foreign", "SECRET", domain=".unrelated.invalid")
        with patch.object(browser_cookie3, "brave", return_value=jar) as reader:
            cookies = web.load_vk_cookies()
        self.assertEqual(len(cookies), 2)
        self.assertEqual([call.kwargs["domain_name"] for call in reader.call_args_list], ["vk.ru", "vk.com"])
        with patch.object(browser_cookie3, "brave", side_effect=RuntimeError("SECRET")):
            with self.assertRaises(web.BrowserSourceError) as caught:
                web.load_vk_cookies()
        self.assertNotIn("SECRET", str(caught.exception))

    def test_web_source_never_calls_api_to_identify_session(self):
        session = Mock()
        session.headers = {}
        client = web.WebAudioClient(session, cookie_jar(), threading.Event())
        self.assertEqual(client.user_id, 123)
        session.request.assert_not_called()

    def test_user_id_can_come_from_authenticated_page(self):
        jar = RequestsCookieJar()
        jar.set("remixsid", "TEST_SESSION", domain=".vk.ru")
        session = Mock()
        session.headers = {}
        response = session.request.return_value
        response.status_code = 200
        response.url = "https://vk.ru/feed"
        response.text = 'var vk = { id: 456, test: true };'
        client = web.WebAudioClient(session, jar, threading.Event())
        self.assertEqual(client.user_id, 456)

    def test_web_list_preserves_hidden_tracks_and_limit(self):
        session = Mock()
        session.headers = {}
        client = web.WebAudioClient(session, cookie_jar(), threading.Event(), limit=2)
        response = Mock()
        response.json.return_value = {"data": [{"list": [audio_row(1), audio_row(2, ""), audio_row(3)],
                                               "hasMore": True}]}
        track = {"id": 1, "owner_id": 50, "title": "Title", "artist": "Artist", "url": "https://cdn.invalid/music.m3u8"}
        with patch.object(client, "post", return_value=response), \
                patch.object(web, "scrap_tracks", return_value=iter([track])) as reload, redirect_stdout(io.StringIO()):
            rows = client.fetch(50)
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["url"], track["url"])
        self.assertEqual(rows[1]["url"], "")
        self.assertFalse(reload.call_args.kwargs["convert_m3u8_links"])

    def test_repeated_web_page_is_error(self):
        session = Mock()
        session.headers = {}
        client = web.WebAudioClient(session, cookie_jar(), threading.Event())
        response = Mock()
        response.json.return_value = {"data": [{"list": [audio_row(1, "")], "hasMore": True}]}
        with patch.object(client, "post", return_value=response), patch.object(client.stop, "wait", return_value=False):
            with self.assertRaises(web.BrowserSourceError):
                client.fetch(50)

    def test_vks_login_redirect_is_reported(self):
        session = Mock()
        session.headers = {}
        client = web.WebAudioClient(session, cookie_jar(), threading.Event())
        response = session.request.return_value
        response.status_code = 302
        with self.assertRaises(web.BrowserSourceError):
            client.get("https://vk.ru/feed", allow_redirects=False)


if __name__ == "__main__":
    unittest.main()
