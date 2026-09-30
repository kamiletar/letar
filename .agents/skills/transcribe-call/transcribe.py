"""Расшифровка аудиозаписи (созвон, интервью) через faster-whisper на GPU.

Устройство: этот процесс — супервизор. Он запускает воркер подпроцессом и
перезапускает его с нужного места, если тот молча упадёт (например exit
code 9 без трассировки — известный баг, см. .claude/skills/transcribe-call/SKILL.md).
Падение — это крах самого процесса, поэтому try/except внутри одного процесса
его не перехватывает; нужен отдельный родитель, который переживёт крах.

После склейки супервизор перераспознаёт сегменты с известными галлюцинациями
Whisper: вырезает окно вокруг сегмента и прогоняет его с другими параметрами
(тоже отдельным подпроцессом — по той же причине).

Запуск: python transcribe.py <аудио> [опции]
    --compute-type float32|int8_float16   (по умолчанию float32)
    --hotwords "слово1, слово2, ..."      (подсказка модели, опционально)
    --hotwords-file <путь к .txt>         (то же, но из файла — не коммитить с личными терминами)
    --start-sec 0                         (ручной старт с секунды, для докрутки без автоповтора)
    --max-retries 5                       (сколько раз пересобирать после падений подряд)
    --no-retry-hallucinations             (не перераспознавать помеченные сегменты)
    --retry-only                          (только перераспознать помеченное в готовом <аудио>.timed.txt)
"""

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
import time
import zlib
from pathlib import Path

SAMPLE_RATE = 16000

# Известные галлюцинации Whisper на тишине/музыке — не удаляем, помечаем для ручной проверки
KNOWN_HALLUCINATIONS = (
    "продолжение следует",
    "субтитры делал",
    "субтитры сделал",
    "редактор субтитров",
    "корректор субтитров",
    "подписывайтесь на канал",
    "спасибо за просмотр",
)

HALLUCINATION_MARK = "[ВОЗМОЖНАЯ ГАЛЛЮЦИНАЦИЯ WHISPER, ПРОВЕРИТЬ]"
RETRIED_MARK = "[ПЕРЕРАСПОЗНАНО]"

# Сколько секунд аудио брать по краям помеченного сегмента при перераспознавании
RETRY_PAD_SEC = 5.0

# Лестница попыток перераспознавания, до первого приемлемого результата.
# Основной проход уже идёт без контекста прошлого окна и с VAD, поэтому менять нужно другое:
# - температура с 0.2: на temperature=0 короткая уверенная галлюцинация проходит пороги
#   compression_ratio/log_prob и fallback не срабатывает;
# - без hotwords: faster-whisper подаёт их в prompt каждого окна, а prompt — известный
#   провокатор «субтитровых» галлюцинаций;
# - без VAD: на случай, если VAD склеил речь в неудачный кусок.
# Сам сдвиг окна (±RETRY_PAD_SEC) тоже меняет выравнивание 30-секундных окон модели.
RETRY_ATTEMPTS = (
    {"hotwords": True, "vad_filter": True, "temperature": (0.2, 0.4, 0.6, 0.8, 1.0)},
    {"hotwords": False, "vad_filter": True, "temperature": (0.0, 0.2, 0.4, 0.6, 0.8, 1.0)},
    {"hotwords": False, "vad_filter": False, "temperature": (0.4, 0.6, 0.8, 1.0)},
)

# Порог сжатия, как у самого Whisper: выше — текст зациклен на повторе
MAX_COMPRESSION_RATIO = 2.4


def add_cuda_dll_dirs() -> None:
    # cuBLAS/cuDNN из pip-пакетов nvidia-* не лежат в PATH, CTranslate2 иначе их не найдёт
    try:
        import nvidia
    except ImportError:
        return
    for root in nvidia.__path__:
        for sub in ("cublas", "cudnn", "cuda_nvrtc"):
            bin_dir = Path(root) / sub / "bin"
            if bin_dir.is_dir():
                os.add_dll_directory(str(bin_dir))
                os.environ["PATH"] = str(bin_dir) + os.pathsep + os.environ["PATH"]


def fmt(seconds: float) -> str:
    m, s = divmod(int(seconds), 60)
    h, m = divmod(m, 60)
    return f"{h:d}:{m:02d}:{s:02d}"


TIMED_LINE_RE = re.compile(r"^\[(\d+):(\d{2}):(\d{2}) -> (\d+):(\d{2}):(\d{2})\] ?(.*)$")


def parse_timed_line(line: str):
    m = TIMED_LINE_RE.match(line.rstrip("\n"))
    if not m:
        return None
    h1, m1, s1, h2, m2, s2, text = m.groups()
    start = int(h1) * 3600 + int(m1) * 60 + int(s1)
    end = int(h2) * 3600 + int(m2) * 60 + int(s2)
    return start, end, text


def part_paths(audio: Path, start_sec: float):
    # Суффикс нужен и для старта с 0: иначе часть совпадает с итоговым файлом, и merge_parts
    # обнуляет её открытием на запись раньше, чем прочитает
    suffix = f".from{int(start_sec)}"
    return audio.with_suffix(f"{suffix}.timed.txt"), audio.with_suffix(f"{suffix}.txt")


def last_end_second(timed_path: Path) -> float | None:
    if not timed_path.exists():
        return None
    last = None
    with timed_path.open("r", encoding="utf-8") as f:
        for line in f:
            parsed = parse_timed_line(line)
            if parsed:
                last = parsed[1]
    return last


def run_subprocess(args: list[str]) -> int:
    env = dict(os.environ)
    env["PYTHONIOENCODING"] = "utf-8"
    proc = subprocess.run([sys.executable, str(Path(__file__).resolve()), *args], env=env)
    return proc.returncode


def run_worker(audio: Path, compute_type: str, start_sec: float, hotwords: str) -> int:
    return run_subprocess(
        ["--worker", str(audio), "--compute-type", compute_type, "--start-sec", str(start_sec), "--hotwords", hotwords]
    )


def load_model(compute_type: str):
    add_cuda_dll_dirs()
    from faster_whisper import WhisperModel
    import faulthandler

    faulthandler.enable()
    return WhisperModel("large-v3", device="cuda", compute_type=compute_type)


def worker_main(audio: Path, compute_type: str, start_sec: float, hotwords: str) -> None:
    timed_path, plain_path = part_paths(audio, start_sec)

    print(f"Модель large-v3, cuda, {compute_type}. Файл: {audio}, старт {fmt(start_sec)}", flush=True)
    model = load_model(compute_type)
    from faster_whisper import decode_audio

    audio_data = decode_audio(str(audio), sampling_rate=SAMPLE_RATE)[int(start_sec * SAMPLE_RATE) :]
    total = start_sec + len(audio_data) / SAMPLE_RATE

    started = time.time()
    segments, _info = model.transcribe(
        audio_data,
        language="ru",
        beam_size=5,
        best_of=5,
        # На длинных записях контекст прошлого окна провоцирует зацикливание фраз
        condition_on_previous_text=False,
        # VAD вырезает тишину — главный источник галлюцинаций вида «Субтитры сделал…»
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 500},
        hotwords=hotwords or None,
    )
    print(f"Длительность: {fmt(total)}, старт с {fmt(start_sec)}", flush=True)

    with timed_path.open("w", encoding="utf-8") as timed, plain_path.open("w", encoding="utf-8") as plain:
        for seg in segments:
            text = seg.text.strip()
            start, end = seg.start + start_sec, seg.end + start_sec
            line = f"[{fmt(start)} -> {fmt(end)}] {text}"
            timed.write(line + "\n")
            plain.write(text + "\n")
            timed.flush()
            plain.flush()
            pct = end / total * 100 if total else 0
            print(f"{pct:5.1f}% {line}", flush=True)

    print(f"Часть готова за {fmt(time.time() - started)}: {timed_path}", flush=True)


def is_hallucination(text: str) -> bool:
    low = text.lower()
    return any(h in low for h in KNOWN_HALLUCINATIONS)


def is_acceptable_retry(text: str) -> bool:
    if not text or is_hallucination(text):
        return False
    raw = text.encode("utf-8")
    return len(raw) / len(zlib.compress(raw)) <= MAX_COMPRESSION_RATIO


def _norm_word(word: str) -> str:
    return re.sub(r"[^\w]", "", word.lower())


def _overlap_len(tail: list[str], head: list[str]) -> int:
    """Сколько последних слов tail совпадают с первыми словами head (без регистра и знаков)."""
    tail_n = [w for w in map(_norm_word, tail) if w]
    head_n = [_norm_word(w) for w in head]
    for k in range(min(len(tail_n), len(head_n), 8), 0, -1):
        # Одно совпавшее короткое слово («и», «да») — скорее случайность, чем перекрытие
        if k == 1 and len(head_n[0]) < 5:
            break
        if tail_n[-k:] == head_n[:k]:
            return k
    return 0


def trim_neighbour_overlap(text: str, prev_text: str, next_text: str) -> str:
    """Окно перераспознавания захватывает края соседних строк: границы сегментов основного
    прохода неточны, а таймкоды округлены до секунды. Срезаем слова, повторяющие соседей."""
    words = text.split()
    words = words[_overlap_len(prev_text.split(), words) :]
    rev_overlap = _overlap_len([w for w in reversed(next_text.split())], list(reversed(words)))
    return " ".join(words[: len(words) - rev_overlap]).strip()


def retry_worker_main(audio: Path, compute_type: str, hotwords: str, windows_path: Path, out_path: Path) -> None:
    """Перераспознаёт окна из windows_path; результат пишет в out_path после каждого окна,
    чтобы пережить падение процесса посреди списка."""
    windows = json.loads(windows_path.read_text(encoding="utf-8"))
    results = json.loads(out_path.read_text(encoding="utf-8")) if out_path.exists() else {}

    print(f"Перераспознавание {len(windows)} сегм., модель large-v3, cuda, {compute_type}", flush=True)
    model = load_model(compute_type)
    from faster_whisper import decode_audio

    audio_data = decode_audio(str(audio), sampling_rate=SAMPLE_RATE)
    duration = len(audio_data) / SAMPLE_RATE

    for win in windows:
        key = str(win["id"])
        if key in results:
            continue
        seg_start, seg_end = win["start"], win["end"]
        # Таймкоды в .timed.txt округлены вниз до секунды, а пословные таймкоды плавают на доли
        # секунды — берём с запасом по секунде с обеих сторон: лишнее срежет
        # trim_neighbour_overlap, а потерянное слово на стыке не заметит никто
        keep_from, keep_to = seg_start - 1, seg_end + 1
        win_start = max(0.0, seg_start - RETRY_PAD_SEC)
        win_end = min(duration, seg_end + 1 + RETRY_PAD_SEC)
        chunk = audio_data[int(win_start * SAMPLE_RATE) : int(win_end * SAMPLE_RATE)]

        accepted = None
        for n, attempt in enumerate(RETRY_ATTEMPTS, 1):
            segments, _info = model.transcribe(
                chunk,
                language="ru",
                beam_size=5,
                best_of=5,
                condition_on_previous_text=False,
                temperature=list(attempt["temperature"]),
                vad_filter=attempt["vad_filter"],
                vad_parameters={"min_silence_duration_ms": 500} if attempt["vad_filter"] else None,
                hotwords=(hotwords or None) if attempt["hotwords"] else None,
                # Пословные таймкоды — чтобы из окна с запасом взять только слова самого сегмента,
                # а не повторить речь соседних строк
                word_timestamps=True,
            )
            words = []
            for seg in segments:
                for w in seg.words or ():
                    mid = win_start + (w.start + w.end) / 2
                    if keep_from <= mid < keep_to:
                        words.append(w.word)
            text = "".join(words).strip()
            ok = is_acceptable_retry(text)
            verdict = "принято" if ok else "отклонено"
            print(f"  [{fmt(seg_start)} -> {fmt(seg_end)}] попытка {n}: {verdict} ({len(text)} симв.)", flush=True)
            if ok:
                accepted = text
                break

        results[key] = accepted
        out_path.write_text(json.dumps(results, ensure_ascii=False), encoding="utf-8")


def read_timed(timed_path: Path) -> list[dict]:
    """Строки .timed.txt в записи; уже поставленные скриптом пометки снимаются в поле status."""
    entries = []
    with timed_path.open("r", encoding="utf-8") as f:
        for line in f:
            parsed = parse_timed_line(line)
            if not parsed:
                entries.append({"raw": line})
                continue
            s, e, text = parsed
            status = None
            for mark, mark_status in ((HALLUCINATION_MARK, "hallucination"), (RETRIED_MARK, "retried")):
                if text.startswith(mark):
                    text, status = text[len(mark) :].lstrip(), mark_status
                    break
            if status is None and is_hallucination(text):
                status = "hallucination"
            entries.append({"start": s, "end": e, "text": text, "status": status})
    return entries


def write_outputs(audio: Path, entries: list[dict]) -> None:
    final_timed = audio.with_suffix(".timed.txt")
    final_plain = audio.with_suffix(".txt")
    marks = {"hallucination": HALLUCINATION_MARK, "retried": RETRIED_MARK}
    with final_timed.open("w", encoding="utf-8") as timed_out, final_plain.open("w", encoding="utf-8") as plain_out:
        for entry in entries:
            if "raw" in entry:
                timed_out.write(entry["raw"])
                continue
            mark = marks.get(entry["status"])
            text = f"{mark} {entry['text']}" if mark else entry["text"]
            timed_out.write(f"[{fmt(entry['start'])} -> {fmt(entry['end'])}] {text}\n")
            plain_out.write(text + "\n")
    print(f"Готово: {final_timed} и {final_plain}", flush=True)


def merge_parts(audio: Path, part_starts: list[float]) -> list[dict]:
    entries = []
    for start_sec in part_starts:
        timed_path, _ = part_paths(audio, start_sec)
        if timed_path.exists():
            entries.extend(read_timed(timed_path))
    return entries


def remove_parts(audio: Path, part_starts: list[float]) -> None:
    for start_sec in part_starts:
        for path in part_paths(audio, start_sec):
            path.unlink(missing_ok=True)


def retry_hallucinations(audio: Path, entries: list[dict], compute_type: str, hotwords: str, max_retries: int) -> None:
    flagged = {i: e for i, e in enumerate(entries) if e.get("status") == "hallucination"}
    if not flagged:
        return
    print(f"Помечено как галлюцинация: {len(flagged)} сегм., перераспознаю", flush=True)

    with tempfile.TemporaryDirectory(prefix="transcribe-retry-") as tmp:
        windows_path = Path(tmp) / "windows.json"
        out_path = Path(tmp) / "results.json"
        windows = [{"id": i, "start": e["start"], "end": e["end"]} for i, e in flagged.items()]
        windows_path.write_text(json.dumps(windows), encoding="utf-8")

        args = ["--retry-worker", str(audio), "--compute-type", compute_type, "--hotwords", hotwords]
        args += ["--windows-json", str(windows_path), "--out-json", str(out_path)]
        for attempt in range(max_retries + 1):
            code = run_subprocess(args)
            if code == 0:
                break
            # Воркер дописывает результат после каждого окна — повтор продолжит с недоделанного
            print(f"Воркер перераспознавания упал (код {code}), попытка {attempt + 1}/{max_retries}", flush=True)

        results = json.loads(out_path.read_text(encoding="utf-8")) if out_path.exists() else {}

    timed_idx = [i for i, e in enumerate(entries) if "raw" not in e]
    replaced = 0
    for i, entry in flagged.items():
        text = results.get(str(i))
        if text:
            pos = timed_idx.index(i)
            prev_text = entries[timed_idx[pos - 1]]["text"] if pos > 0 else ""
            next_text = entries[timed_idx[pos + 1]]["text"] if pos + 1 < len(timed_idx) else ""
            text = trim_neighbour_overlap(text, prev_text, next_text)
        if text:
            entry["text"], entry["status"] = text, "retried"
            replaced += 1
    print(f"Перераспознано: {replaced} из {len(flagged)}; остальные оставлены с пометкой", flush=True)


def supervise(
    audio: Path, compute_type: str, start_sec: float, hotwords: str, max_retries: int, retry_flagged: bool
) -> None:
    part_starts = [start_sec]
    current_start = start_sec
    attempts = 0
    while True:
        code = run_worker(audio, compute_type, current_start, hotwords)
        if code == 0:
            break
        attempts += 1
        timed_path, _ = part_paths(audio, current_start)
        resume_from = last_end_second(timed_path)
        if resume_from is None or attempts > max_retries:
            print(
                f"Воркер упал (код {code}) и докрутить не удалось "
                f"(попыток: {attempts}, последний таймкод: {resume_from}). Части не склеены.",
                flush=True,
            )
            sys.exit(code)
        print(f"Воркер упал (код {code}), докручиваю с {fmt(resume_from)} (попытка {attempts}/{max_retries})", flush=True)
        current_start = resume_from
        part_starts.append(current_start)

    entries = merge_parts(audio, part_starts)
    # Склейку пишем до перераспознавания: если оно не доедет, расшифровка всё равно на диске
    write_outputs(audio, entries)
    remove_parts(audio, part_starts)
    if retry_flagged:
        retry_hallucinations(audio, entries, compute_type, hotwords, max_retries)
        write_outputs(audio, entries)


def retry_only(audio: Path, compute_type: str, hotwords: str, max_retries: int) -> None:
    timed_path = audio.with_suffix(".timed.txt")
    if not timed_path.exists():
        sys.exit(f"Нет готовой расшифровки {timed_path} — сначала запусти без --retry-only")
    entries = read_timed(timed_path)
    retry_hallucinations(audio, entries, compute_type, hotwords, max_retries)
    write_outputs(audio, entries)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("audio", type=Path)
    parser.add_argument("--compute-type", default="float32")
    parser.add_argument("--start-sec", type=float, default=0.0)
    parser.add_argument("--hotwords", default="")
    parser.add_argument("--hotwords-file", type=Path, default=None)
    parser.add_argument("--max-retries", type=int, default=5)
    parser.add_argument("--no-retry-hallucinations", action="store_true")
    parser.add_argument("--retry-only", action="store_true")
    parser.add_argument("--worker", action="store_true", help=argparse.SUPPRESS)
    parser.add_argument("--retry-worker", action="store_true", help=argparse.SUPPRESS)
    parser.add_argument("--windows-json", type=Path, help=argparse.SUPPRESS)
    parser.add_argument("--out-json", type=Path, help=argparse.SUPPRESS)
    args = parser.parse_args()

    hotwords = args.hotwords
    if args.hotwords_file:
        hotwords = args.hotwords_file.read_text(encoding="utf-8").strip()

    if args.worker:
        worker_main(args.audio, args.compute_type, args.start_sec, hotwords)
        return
    if args.retry_worker:
        retry_worker_main(args.audio, args.compute_type, hotwords, args.windows_json, args.out_json)
        return
    if args.retry_only:
        retry_only(args.audio, args.compute_type, hotwords, args.max_retries)
        return

    supervise(
        args.audio, args.compute_type, args.start_sec, hotwords, args.max_retries, not args.no_retry_hallucinations
    )


if __name__ == "__main__":
    main()
