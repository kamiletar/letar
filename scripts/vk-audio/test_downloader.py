"""Проверки скачивания на локальном HTTP-сервере без аккаунта VK."""

from collections import Counter
from contextlib import redirect_stdout
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import io
import logging
import os
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import threading
import unittest
from unittest.mock import Mock, patch

import requests

import downloader as dl
import hls_downloader as hls


MP3 = b"ID3\x04\x00\x00\x00\x00\x00\x00" + b"\xff\xfb\x90\x00" * 300


class Handler(BaseHTTPRequestHandler):
    calls: Counter = Counter()
    assets: dict[str, bytes] = {}

    def log_message(self, *args):
        pass

    def do_GET(self):
        Handler.calls[self.path] += 1
        attempt = Handler.calls[self.path]
        if self.path in ("/retry", "/limited") and attempt == 1:
            self.send_response(429 if self.path == "/limited" else 503)
            self.send_header("Content-Length", "0")
            self.send_header("Retry-After", "0")
            self.end_headers()
            return
        if self.path == "/always-fails":
            self.send_response(503)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        if self.path == "/forbidden":
            self.send_response(403)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        if self.path == "/broken" and attempt == 1:
            self.send_response(200)
            self.send_header("Content-Length", str(len(MP3) * 2))
            self.end_headers()
            self.wfile.write(MP3[:20])
            self.wfile.flush()
            self.connection.shutdown(socket.SHUT_RDWR)
            self.connection.close()
            return
        body = Handler.assets.get(self.path, {"/html": b"<html>Login required</html>", "/empty": b"",
                "/hls": b"#EXTM3U\n#EXT-X-VERSION:3"}.get(self.path, MP3))
        self.send_response(200)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


class DownloadTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.directory = Path(self.temp.name)
        self.stop = threading.Event()
        self.log = logging.getLogger("vk-test")
        self.log.addHandler(logging.NullHandler())
        Handler.calls.clear()
        Handler.assets.clear()

    def tearDown(self):
        self.temp.cleanup()

    def track(self, endpoint="/mp3", name="Исполнитель - Трек.mp3"):
        return dl.Track("1_2", "Исполнитель - Трек", self.base + endpoint, self.directory / name)

    def test_complete_file_and_repeat_run(self):
        track = self.track()
        self.assertEqual(dl.download_track(track, self.stop, self.log).status, "downloaded")
        self.assertEqual(track.path.read_bytes(), MP3)
        self.assertFalse(track.path.with_suffix(".mp3.part").exists())
        self.assertEqual(dl.download_track(track, self.stop, self.log).status, "existing")
        self.assertEqual(Handler.calls["/mp3"], 1)

    def test_zero_byte_file_and_old_part_are_replaced(self):
        track = self.track()
        track.path.touch()
        track.path.with_suffix(".mp3.part").write_bytes(b"broken")
        self.assertEqual(dl.download_track(track, self.stop, self.log).status, "downloaded")
        self.assertEqual(track.path.read_bytes(), MP3)

    def test_503_and_429_are_retried(self):
        for endpoint in ("/retry", "/limited"):
            track = self.track(endpoint, endpoint[1:] + ".mp3")
            self.assertEqual(dl.download_track(track, self.stop, self.log, base_delay=0).status, "downloaded")
            self.assertEqual(Handler.calls[endpoint], 2)

    def test_retries_are_bounded_and_no_partial_mp3_remains(self):
        track = self.track("/always-fails")
        result = dl.download_track(track, self.stop, self.log, base_delay=0)
        self.assertEqual(result.status, "error")
        self.assertEqual(result.detail, "HTTP 503")
        self.assertEqual(Handler.calls["/always-fails"], 4)
        self.assertFalse(track.path.exists())
        self.assertFalse(track.path.with_suffix(".mp3.part").exists())

    def test_interrupted_response_restarts_without_appending(self):
        track = self.track("/broken")
        self.assertEqual(dl.download_track(track, self.stop, self.log, base_delay=0).status, "downloaded")
        self.assertEqual(track.path.read_bytes(), MP3)
        self.assertEqual(Handler.calls["/broken"], 2)

    def test_timeout_is_retried(self):
        original = requests.get
        with patch.object(dl.requests, "get", side_effect=[requests.Timeout("secret URL"),
                                                          original(self.base + "/mp3", stream=True)]):
            track = self.track()
            result = dl.download_track(track, self.stop, self.log, base_delay=0)
        self.assertEqual(result.status, "downloaded")

    @unittest.skipUnless(shutil.which("ffmpeg"), "Для HLS-проверки нужен ffmpeg")
    def test_hls_is_converted_to_mp3_with_real_ffmpeg(self):
        playlist = self.directory / "fixture.m3u8"
        subprocess.run([shutil.which("ffmpeg"), "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
                        "-f", "lavfi", "-i", "sine=frequency=440:duration=1", "-c:a", "aac", "-f", "hls",
                        "-hls_time", "1", "-hls_list_size", "0", str(playlist)],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
                       creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        for path in self.directory.glob("fixture*"):
            Handler.assets["/" + path.name] = path.read_bytes()
        track = self.track("/fixture.m3u8", "result.mp3")
        result = dl.download_track(track, self.stop, self.log)
        self.assertEqual(result.status, "downloaded", result.detail)
        self.assertTrue(dl.looks_like_mp3(track.path.read_bytes()[:8192]))
        self.assertGreater(track.path.stat().st_size, 1000)
        self.assertFalse(track.path.with_suffix(".mp3.part").exists())

    def test_hls_temporary_failure_is_retried(self):
        attempts = 0

        def convert(url, path, stop):
            nonlocal attempts
            attempts += 1
            if attempts == 1:
                raise dl.HlsError("network", retryable=True)
            path.write_bytes(MP3)
            return True

        with patch.object(dl, "convert_hls", side_effect=convert) as converter:
            result = dl.download_track(self.track("/playlist.m3u8"), self.stop, self.log, base_delay=0)
        self.assertEqual(result.status, "downloaded")
        self.assertEqual(converter.call_count, 2)

    def test_missing_url_does_not_make_request(self):
        track = dl.Track("1_2", "Нет URL", "", self.directory / "missing.mp3")
        self.assertEqual(dl.download_track(track, self.stop, self.log).status, "no_url")
        self.assertEqual(sum(Handler.calls.values()), 0)

    def test_invalid_media_and_permanent_errors_do_not_retry(self):
        for endpoint in ("/html", "/empty", "/hls", "/forbidden"):
            track = self.track(endpoint, endpoint[1:] + ".mp3")
            result = dl.download_track(track, self.stop, self.log, base_delay=0)
            self.assertEqual(result.status, "error")
            self.assertEqual(Handler.calls[endpoint], 1)
            self.assertFalse(track.path.exists())
            self.assertFalse(track.path.with_suffix(".mp3.part").exists())

    def test_cancelled_download_does_not_make_request(self):
        self.stop.set()
        self.assertEqual(dl.download_track(self.track(), self.stop, self.log).status, "cancelled")
        self.assertEqual(sum(Handler.calls.values()), 0)

    def test_parallel_names_and_skip_log(self):
        items = [
            {"id": 1, "artist": "Artist", "title": "Song", "url": self.base + "/mp3"},
            {"id": 2, "artist": "artist", "title": "song", "url": self.base + "/mp3"},
            {"id": 3, "artist": "Artist", "title": "Hidden", "url": ""},
        ]
        tracks = dl.prepare_tracks(items, self.directory, 1)
        log, skipped = dl.setup_log(self.directory)
        try:
            with redirect_stdout(io.StringIO()):
                counts = dl.run_downloads(tracks, 6, self.stop, log, skipped)
            self.assertEqual(counts["downloaded"], 2)
            self.assertEqual(counts["no_url"], 1)
            self.assertEqual(len(list(self.directory.glob("*.mp3"))), 2)
            self.assertIn("Hidden", (self.directory / "skipped.log").read_text(encoding="utf-8"))
            with redirect_stdout(io.StringIO()):
                counts = dl.run_downloads(tracks, 6, self.stop, log, skipped)
            self.assertEqual(counts["existing"], 2)
        finally:
            for logger in (log, skipped):
                for handler in logger.handlers[:]:
                    logger.removeHandler(handler)
                    handler.close()

    def test_cli_downloads_two_profiles_and_resumes(self):
        api = Mock()
        api.error_handlers = {}
        api.method.side_effect = lambda method, params: {
            "count": 1, "items": [{"id": 1, "artist": "A", "title": "Song", "url": self.base + "/mp3"}]
        }
        command = ["1", "2", "--output", str(self.directory)]
        with patch.dict(os.environ, {"VK_ACCESS_TOKEN": "TEST_TOKEN"}), \
                patch.object(dl.vk_api, "VkApi", return_value=api), redirect_stdout(io.StringIO()) as output:
            self.assertEqual(dl.main(command), 0)
            self.assertIn("скачано 2", output.getvalue())
            self.assertEqual(dl.main(command), 0)
            self.assertIn("уже на диске 2", output.getvalue())
        self.assertEqual(Handler.calls["/mp3"], 2)
        self.assertTrue((self.directory / "1" / "A - Song.mp3").is_file())
        self.assertTrue((self.directory / "2" / "A - Song.mp3").is_file())
        self.assertNotIn("TEST_TOKEN", (self.directory / "download.log").read_text(encoding="utf-8"))

    def test_check_mode_does_not_download(self):
        api = Mock()
        api.error_handlers = {}
        api.method.return_value = {"count": 1, "items": [{"id": 1, "url": self.base + "/mp3"}]}
        with patch.dict(os.environ, {"VK_ACCESS_TOKEN": "TEST_TOKEN"}), \
                patch.object(dl.vk_api, "VkApi", return_value=api), redirect_stdout(io.StringIO()):
            self.assertEqual(dl.main(["1", "--output", str(self.directory), "--check"]), 0)
        self.assertEqual(sum(Handler.calls.values()), 0)
        self.assertEqual(list(self.directory.glob("*.mp3")), [])

    def test_cli_cookie_header_source_with_limit(self):
        cookies = self.directory / "cookies-header.txt"
        cookies.write_text("remixsid=TEST_SESSION; remixmid=123", encoding="utf-8")
        client = Mock()
        client.method.return_value = {"count": 2, "items": [
            {"id": 1, "artist": "A", "title": "One", "url": self.base + "/mp3"},
            {"id": 2, "artist": "A", "title": "Two", "url": self.base + "/mp3"},
        ]}
        with patch.object(dl, "WebAudioClient", return_value=client) as source, \
                patch.dict(os.environ, {"VK_ACCESS_TOKEN": ""}), redirect_stdout(io.StringIO()):
            result = dl.main(["1", "--cookies", str(cookies), "--limit", "1", "--output", str(self.directory)])
        self.assertEqual(result, 0)
        self.assertEqual(len(list(self.directory.glob("*.mp3"))), 1)
        self.assertEqual(len(source.call_args.args[1]), 2)
        self.assertEqual(source.call_args.args[3], 1)


class ListTests(unittest.TestCase):
    def test_1500_tracks_take_one_request_without_offset(self):
        api = Mock()
        items = [{"id": index, "url": ""} for index in range(1500)]
        api.method.return_value = {"count": 1500, "items": items}
        self.assertEqual(len(dl.fetch_tracks(api, 20157923, threading.Event())), 1500)
        api.method.assert_called_once_with("audio.get", {"owner_id": 20157923, "count": 2000})

    def test_truncated_response_uses_offset(self):
        api = Mock()
        api.method.side_effect = [{"count": 3, "items": [{"id": 1}, {"id": 2}]},
                                  {"count": 3, "items": [{"id": 3}]}]
        with redirect_stdout(io.StringIO()):
            tracks = dl.fetch_tracks(api, 1, threading.Event())
        self.assertEqual(len(tracks), 3)
        self.assertEqual(api.method.call_args.args[1], {"owner_id": 1, "count": 2000, "offset": 2})

    def test_empty_or_repeated_page_is_not_reported_as_full(self):
        for tail in ([], [{"id": 1}]):
            api = Mock()
            api.method.side_effect = [{"count": 3, "items": [{"id": 1}]}, {"count": 3, "items": tail}]
            with redirect_stdout(io.StringIO()), self.assertRaises(dl.DownloadError):
                dl.fetch_tracks(api, 1, threading.Event())

    def test_resolve_numeric_and_named_profiles(self):
        api = Mock()
        stop = threading.Event()
        for reference in ("20157923", "https://vk.ru/audios20157923", "https://vk.com/id20157923?x=1"):
            self.assertEqual(dl.resolve_owner(reference, api, stop), 20157923)
        api.method.assert_not_called()
        api.method.return_value = {"type": "user", "object_id": 123}
        self.assertEqual(dl.resolve_owner("https://vk.ru/screen_name", api, stop), 123)
        api.method.return_value = {"type": "group", "object_id": 123}
        self.assertEqual(dl.resolve_owner("screen_name", api, stop), -123)
        with self.assertRaises(dl.DownloadError):
            dl.resolve_owner("https://vk.ru.evil.invalid/id123", api, stop)

    def test_filenames_are_safe_and_collisions_dont_overwrite(self):
        name = dl.safe_name(' CON: /\\*?"<>|\n. ')
        self.assertFalse(dl.INVALID_CHARS.search(name))
        self.assertEqual(dl.safe_name("CON"), "_CON")
        self.assertEqual(dl.safe_name("LPT1.foo"), "_LPT1.foo")
        self.assertEqual(dl.safe_name("..."), "Без названия")
        self.assertLessEqual(len(dl.short_name("Я" * 400).encode()), 160)
        items = [{"id": 1, "artist": "A/B", "title": "Song"},
                 {"id": 2, "artist": "A?B", "title": "Song"},
                 {"id": 1, "artist": "A/B", "title": "Song"}]
        tracks = dl.prepare_tracks(items, Path("."), 1)
        reverse = dl.prepare_tracks(items[::-1], Path("."), 1)
        self.assertEqual(len(tracks), 2)
        self.assertEqual(len({track.path.name.casefold() for track in tracks}), 2)
        self.assertEqual({track.key: track.path for track in tracks}, {track.key: track.path for track in reverse})

    def test_retry_backoff_and_retry_after(self):
        self.assertEqual([dl.retry_delay(i) for i in range(3)], [1, 2, 4])
        response = requests.Response()
        response.headers["Retry-After"] = "12"
        self.assertEqual(dl.retry_delay(0, response), 12)
        response.headers["Retry-After"] = "invalid"
        self.assertEqual(dl.retry_delay(1, response), 2)

    def test_access_denied_is_actionable_and_token_not_logged(self):
        api = Mock()
        error = dl.ApiError(api, "audio.get", {"access_token": "SECRET"}, False,
                           {"error_code": 15, "error_msg": "SECRET"})
        api.method.side_effect = error
        with self.assertRaises(dl.DownloadError) as caught:
            dl.fetch_tracks(api, 1, threading.Event())
        self.assertIn("закрытый аудио API", str(caught.exception))
        self.assertNotIn("SECRET", str(caught.exception))
        api.method.assert_called_once()

    def test_failed_keys_use_last_recorded_result(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "download.log"
            path.write_text("date ERROR song [1_2]: failed\n"
                            "date INFO downloaded: song [1_2]\n"
                            "date ERROR other [1_3]: failed\n"
                            "date WARNING repeat [1_3]\n", encoding="utf-8")
            self.assertEqual(dl.failed_keys(path), {"1_3"})


class HlsErrorTests(unittest.TestCase):
    def test_ffmpeg_new_server_error_message_is_retryable_and_redacted(self):
        process = Mock()
        process.returncode = 1
        process.poll.return_value = 1
        process.communicate.return_value = (None, b"Error opening input: Server returned 5XX Server Error reply\nSECRET_URL")
        with patch.object(hls.shutil, "which", return_value="ffmpeg"), \
                patch.object(hls.subprocess, "Popen", return_value=process):
            with self.assertRaises(hls.HlsError) as caught:
                hls.convert_hls("https://example.invalid/SECRET_URL", Path("unused.part"), threading.Event())
        self.assertTrue(caught.exception.retryable)
        self.assertIn("5xx", str(caught.exception))
        self.assertNotIn("SECRET_URL", str(caught.exception))


if __name__ == "__main__":
    unittest.main()
